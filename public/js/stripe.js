import axios from 'axios';
import { showAlert } from './alerts';

const stripe = Stripe(
  'pk_test_51PM4ZJJxBzv1QN8OdnX5eT0EHtnZpf4XPa9WIRDlrwz7niuhmn597SRp5KxDfDJ8KXNK5oZJeKjRQGrQu1T5Buqy00hSEWSRnN',
);

export const bookTour = async tourId => {
  try {
    // 1) Get checkout session from API
    const session = await axios(
      `/api/v1/bookings/checkout-session/${tourId}`,
    );
    console.log(session);

    // 2) Create checkout form + chanre credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
