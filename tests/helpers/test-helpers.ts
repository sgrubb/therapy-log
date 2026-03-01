export function wrapped<T>(data: T) {
  return { success: true, data };
}

export const mockTherapists = [
  { id: 1, first_name: "Alice", last_name: "Morgan", is_admin: true },
  { id: 2, first_name: "Bob", last_name: "Chen", is_admin: false },
];

export const mockClientBase = {
  hospital_number: "HN001",
  dob: new Date("2000-01-01T00:00:00.000Z"),
  address: null,
  phone: "07700900001",
  email: null,
  session_day: null,
  session_time: null,
  is_closed: false,
  pre_score: null,
  post_score: null,
  outcome: null,
  notes: null,
};
