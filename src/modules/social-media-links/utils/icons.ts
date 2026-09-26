// src/modules/social-media-links/utils/icons.ts

/**
 * The icons an administrator may pick for a footer contact line or a social
 * link, by name. One list for both halves: the footer draws them side by side
 * in the same orange, and a Mail glyph is as much at home on a contact line as
 * a WhatsApp one is in the social row.
 *
 * The site draws these as React components - something a database cannot
 * hold. So the record stores the name and the site maps it back to a component
 * through a lookup of exactly these keys.
 *
 * Every name but two is a lucide-react 0.460 export, which both front ends
 * ship. XLogo and WhatsApp are not: lucide has no glyph for either brand, so
 * the admin panel (through its IconPicker's extras) and the website (through
 * its social icon registry) each draw them with a small inline SVG of their
 * own under exactly these names.
 *
 * An allowlist rather than "any lucide name" for two reasons: an unknown name
 * would render nothing at all in the live footer, and lucide ships well over a
 * thousand icons, which is a picker nobody can use. This set is the six the
 * footer already draws (MapPin, Mail, Phone, Globe, Linkedin, Twitter) plus the
 * near neighbours an administrator is likely to reach for next.
 *
 * Adding one means adding it here (with its label in SOCIAL_LINK_LABELS below,
 * which the typecheck insists on), to the admin panel's mirror of this list,
 * and to the website's lookup. All three are checked by the same names, so a
 * name that exists in one and not the others fails loudly rather than
 * silently. The order is the order the picker offers them in.
 */
export const SOCIAL_MEDIA_ICON_NAMES = [
  // Contact lines: where, how to write, how to call, where online.
  'MapPin',
  'Mail',
  'Phone',
  'PhoneCall',
  'Smartphone',
  'Globe',
  'Building2',
  'Clock',
  'Headset',
  'AtSign',
  'MessageCircle',
  'Send',
  'Link2',

  // Social networks. XLogo and WhatsApp are the two custom brand glyphs.
  'Linkedin',
  'Twitter',
  'XLogo',
  'Facebook',
  'Instagram',
  'Youtube',
  'WhatsApp',
  'Github',
  'Dribbble',
  'Twitch',
  'Rss',
] as const;

export type SocialMediaIconName = (typeof SOCIAL_MEDIA_ICON_NAMES)[number];

export const isSocialMediaIconName = (value: string): value is SocialMediaIconName =>
  (SOCIAL_MEDIA_ICON_NAMES as readonly string[]).includes(value);

/**
 * What a social link is called - its aria-label and tooltip - by its icon. Not
 * an input: the footer button shows the icon alone, so its name is simply the
 * platform the icon stands for, and the service writes it from this map
 * whenever a link's icon is set (on create, and on an edit that changes the
 * icon). A Record over every allowed name, so adding an icon without a label
 * fails the typecheck. The contact-line glyphs are here too because a social
 * link may use any icon from the one list.
 */
export const SOCIAL_LINK_LABELS: Readonly<Record<SocialMediaIconName, string>> = {
  MapPin: 'Location',
  Mail: 'Email',
  Phone: 'Phone',
  PhoneCall: 'Phone',
  Smartphone: 'Phone',
  Globe: 'Website',
  Building2: 'Office',
  Clock: 'Hours',
  Headset: 'Support',
  AtSign: 'Email',
  MessageCircle: 'Chat',
  Send: 'Telegram',
  Link2: 'Link',

  Linkedin: 'LinkedIn',
  Twitter: 'Twitter',
  XLogo: 'X',
  Facebook: 'Facebook',
  Instagram: 'Instagram',
  Youtube: 'YouTube',
  WhatsApp: 'WhatsApp',
  Github: 'GitHub',
  Dribbble: 'Dribbble',
  Twitch: 'Twitch',
  Rss: 'RSS',
};

/**
 * The label for an icon name. Every caller passes a name the validator (or the
 * seed data) has already checked against the allowlist; an unknown one falls
 * back to itself rather than to an empty aria-label.
 */
export const socialLinkLabel = (icon: string): string =>
  isSocialMediaIconName(icon) ? SOCIAL_LINK_LABELS[icon] : icon;
