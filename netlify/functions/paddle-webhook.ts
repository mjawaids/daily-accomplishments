import { Handler } from '@netlify/functions';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role key (server-side only)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '');

// Paddle webhook secret from environment
const paddleWebhookSecret = process.env.PADDLE_WEBHOOK_SECRET;

// Verify Paddle webhook signature
function verifyPaddleSignature(
  body: string,
  signature: string | undefined
): boolean {
  if (!paddleWebhookSecret || !signature) {
    console.error('Missing webhook secret or signature');
    return false;
  }

  const hash = crypto
    .createHmac('sha256', paddleWebhookSecret)
    .update(body)
    .digest('hex');

  return hash === signature;
}

interface PaddleEventData {
  id: string;
  type: string;
  data: {
    id?: string;
    status?: string;
    customer_id?: string;
    items?: Array<{
      price: {
        id: string;
      };
    }>;
    custom_data?: {
      userId?: string;
    };
    passthrough?: string;
  };
}

const handler: Handler = async (event) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const signature = event.headers['paddle-signature'];
    const body = event.body || '';

    // Verify webhook signature
    if (!verifyPaddleSignature(body, signature)) {
      console.error('Invalid Paddle webhook signature');
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid signature' }),
      };
    }

    const paddleEvent: PaddleEventData = JSON.parse(body);

    console.log(`[Paddle Webhook] Received event: ${paddleEvent.type} (${paddleEvent.id})`);

    // Handle transaction.completed event for paid subscriptions
    if (paddleEvent.type === 'transaction.completed') {
      const transaction = paddleEvent.data;
      const status = transaction.status;

      // Only process completed, paid transactions
      if (status !== 'completed') {
        console.log(`[Paddle Webhook] Skipping transaction with status: ${status}`);
        return {
          statusCode: 200,
          body: JSON.stringify({ processed: false, reason: 'Not completed' }),
        };
      }

      // Extract user ID from passthrough
      let userId: string | null = null;

      if (transaction.passthrough) {
        try {
          const parsed = JSON.parse(transaction.passthrough);
          userId = parsed.userId;
        } catch (e) {
          console.warn('Could not parse passthrough:', e);
        }
      }

      // Fallback: check custom_data
      if (!userId && transaction.custom_data?.userId) {
        userId = transaction.custom_data.userId;
      }

      if (!userId) {
        console.error('[Paddle Webhook] No userId found in transaction');
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'No userId in passthrough' }),
        };
      }

      // Update user's subscription status in Supabase profiles table
      const { error: upsertError } = await supabase.from('profiles').upsert(
        {
          id: userId,
          subscription_status: 'active',
          subscription_plan: 'pro',
          paddle_customer_id: transaction.customer_id,
          paddle_transaction_id: transaction.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (upsertError) {
        console.error('[Paddle Webhook] Error updating profiles:', upsertError);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Failed to update subscription' }),
        };
      }

      console.log(`[Paddle Webhook] Successfully marked user ${userId} as Pro subscriber`);
      return {
        statusCode: 200,
        body: JSON.stringify({
          processed: true,
          userId,
          message: 'Subscription activated',
        }),
      };
    }

    // Handle transaction.cancelled for subscription cancellation
    if (paddleEvent.type === 'transaction.cancelled') {
      const transaction = paddleEvent.data;
      let userId: string | null = null;

      if (transaction.passthrough) {
        try {
          const parsed = JSON.parse(transaction.passthrough);
          userId = parsed.userId;
        } catch (e) {
          console.warn('Could not parse passthrough:', e);
        }
      }

      if (!userId && transaction.custom_data?.userId) {
        userId = transaction.custom_data.userId;
      }

      if (userId) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            subscription_status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (updateError) {
          console.error('[Paddle Webhook] Error updating cancellation:', updateError);
          return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to update cancellation' }),
          };
        }

        console.log(`[Paddle Webhook] Marked user ${userId} subscription as cancelled`);
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ processed: true, type: 'cancellation' }),
      };
    }

    // Log other event types
    console.log(`[Paddle Webhook] Ignoring event type: ${paddleEvent.type}`);
    return {
      statusCode: 200,
      body: JSON.stringify({ processed: false, reason: 'Event type not handled' }),
    };
  } catch (error) {
    console.error('[Paddle Webhook] Error processing webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

export { handler };
