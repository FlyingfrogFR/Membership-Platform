import { fr } from './fr'

// Strings for the Discord exports of the Contribuer board only — the site UI
// itself stays French (fr.ts). Only the frame of the message (titles, labels,
// links) is localized: the needs content is posted exactly as the teams wrote it.
export type DiscordLang = 'fr' | 'en'

export interface DiscordStrings {
  partSuffix: (i: number, total: number) => string
  continued: string
  needsTitle: string
  needsIntro: string
  needsFooter: (origin: string) => string
  type: Record<'poste' | 'ponctuel', string>
  skills: (list: string) => string
}

export const DISCORD_STRINGS: Record<DiscordLang, DiscordStrings> = {
  fr: {
    partSuffix: fr.discord.partSuffix,
    continued: fr.discord.continued,
    needsTitle: fr.discordNeeds.title,
    needsIntro: fr.discordNeeds.intro,
    needsFooter: fr.discordNeeds.footer,
    type: fr.contribuer.type,
    skills: (list) => `${fr.contribuer.skills} : ${list}`,
  },
  en: {
    partSuffix: (i, total) => `*(message ${i}/${total})*`,
    continued: '*(continued)*',
    needsTitle: 'Get involved — the vACC could use a hand',
    needsIntro: 'Want to help out? Here are the teams’ current open needs. No need to commit for a year: every bit helps!',
    needsFooter: (origin) => `📎 The full board (filters and details): ${origin}/contribuer`,
    type: { poste: 'Position', ponctuel: 'One-off' },
    skills: (list) => `Skills: ${list}`,
  },
}
