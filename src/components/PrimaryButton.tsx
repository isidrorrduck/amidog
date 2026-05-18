import Button, { ButtonProps } from './Button';

export default function PrimaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="primary" {...props} />;
}
