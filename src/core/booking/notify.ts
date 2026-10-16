import "server-only";

/**
 * E-mail notifications about a new reservation (B6). Filled in by Z11 (transactional e-mail queue);
 * until then a no-op so the booking flow is complete.
 */
export async function notifyReservationCreated(reservationId: string): Promise<void> {
  void reservationId;
}

/** E-mail to the owner that a guest asked for cancellation (B6). Filled in by Z11. */
export async function notifyCancellationRequested(token: string): Promise<void> {
  void token;
}
