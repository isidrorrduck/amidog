import { Redirect } from 'expo-router';

export default function BookingsScreen() {
  return <Redirect href={'/reservations' as never} />;
}
