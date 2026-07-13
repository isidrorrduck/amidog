import type { ImageSourcePropType } from 'react-native';

export interface PublicOwnerBranding {
  contact: {
    email: string;
    emailHref: string;
    name: string;
    phone: string;
    phoneHref: string;
    role: string;
  };
  sgService: {
    logo: ImageSourcePropType;
    url: string;
  };
}

export const SG_SERVICE_PUBLIC_OWNER_BRANDING: PublicOwnerBranding = {
  contact: {
    email: 'info@sgservice.es',
    emailHref: 'mailto:info@sgservice.es',
    name: 'Isidro',
    phone: '+34 659 25 98 06',
    phoneHref: 'tel:+34659259806',
    role: 'Criador · Cachorros del Guadarrama',
  },
  sgService: {
    logo: require('../../../assets/logo-sgservice-blue.png'),
    url: 'https://www.sgservice.es/',
  },
};
