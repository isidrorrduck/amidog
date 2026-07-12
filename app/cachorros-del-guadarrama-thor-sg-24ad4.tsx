import PublicPuppyOwnerRoute from './public/puppies/[slug]';

const PUBLIC_PUPPY_SLUG = 'cachorros-del-guadarrama-thor-sg-24ad4';

/** Canonical public route. The generic technical route remains available as an alias. */
export default function ThorPublicOwnerRoute() {
  return <PublicPuppyOwnerRoute slugOverride={PUBLIC_PUPPY_SLUG} />;
}
