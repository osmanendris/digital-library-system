// A "review tab" is a resource opened via ?review=1 (from the Approval
// Queue's epub review flow - see ApprovalQueueGeneric.jsx). It's meant to
// show ONLY the file itself in that standalone tab, not the whole
// website's navbar/sidebar around it - closing the tab (see the button in
// ResourceReader.jsx) is how you get back to the Approval Queue, since a
// window.open'd tab's browser history can never contain it anyway.
export function isReviewTab(search) {
  return new URLSearchParams(search).get('review') === '1';
}
