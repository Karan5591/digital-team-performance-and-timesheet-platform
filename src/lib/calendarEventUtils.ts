export function enrichCalendarEvent(event: any, users: any[] = []) {
  if (event?.type !== 'leave') {
    return event;
  }

  const applicant = users.find((user) => user.id === event.user_id);

  return {
    ...event,
    submitted_by_name: event.submitted_by_name || event.applicant_name || applicant?.name || 'Unknown',
  };
}
