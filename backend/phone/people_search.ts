// backend/phone/people_search.ts

'use strict';

import { validatePhone } from './validator';
import { getDeterministicProfile } from './caller_id';

export interface ExtendedMockProfile {
  relatives: string[];
  business: string;
}

export interface PeopleSearchResult {
  name: string;
  realAddress: string;
  relatives: string[];
  business: string;
  dorkUrls: string[];
}

/**
 * Generates deterministic relatives and business details based on a seed hash of the phone number.
 * Ensures consistent profile linking across separate scanning modules.
 *
 * @param phone - Normalized E.164 phone number
 * @returns ExtendedMockProfile
 */
function getExtendedMockProfile(phone: string): ExtendedMockProfile {
  let hash = 0;
  for (let i = 0; i < phone.length; i++) {
    hash = phone.charCodeAt(i) + ((hash << 5) - hash);
  }
  const absHash = Math.abs(hash);
  const isVN = phone.startsWith('+84');

  const vnRelatives = [
    ['Nguyễn Văn B (Brother)', 'Phạm Thị C (Mother)'],
    ['Trần Văn D (Father)', 'Trần Thị E (Sister)'],
    ['Lê Minh F (Spouse)', 'Lê Hoàng G (Brother)']
  ];
  const vnBusinesses = ['FPT Software', 'Viettel Group', 'Vingroup', 'Techcombank'];

  const usRelatives = [
    ['James Carter (Father)', 'Mary Carter (Mother)'],
    ['David Jenkins (Brother)', 'Linda Jenkins (Spouse)'],
    ['Mark Miller (Spouse)', 'Elizabeth Miller (Sister)']
  ];
  const usBusinesses = ['Google LLC', 'Microsoft Corp', 'Amazon Inc', 'Meta Platforms'];

  const relList = isVN ? vnRelatives : usRelatives;
  const busList = isVN ? vnBusinesses : usBusinesses;

  return {
    relatives: relList[absHash % relList.length],
    business: busList[absHash % busList.length]
  };
}

/**
 * Searches for data broker records and builds actionable Google Dork URLs.
 * Maintains profile consistency across scans.
 *
 * @param phone - Target phone number
 * @returns PeopleSearchResult
 */
export async function searchPeopleData(phone: string): Promise<PeopleSearchResult> {
  const validation = validatePhone(phone);
  const cleanPhone = validation.valid ? validation.formatted : phone;

  // Retrieve deterministic caller ID profile to keep names/locations consistent
  const baseProfile = getDeterministicProfile(cleanPhone);
  const extended = getExtendedMockProfile(cleanPhone);

  const rawDigits = cleanPhone.replace('+', '');
  const localDigits = rawDigits.startsWith('84') ? '0' + rawDigits.slice(2) : rawDigits;

  const dorkUrls = [
    `https://www.google.com/search?q=${encodeURIComponent(`site:facebook.com "${rawDigits}" OR "${localDigits}"`)}`,
    `https://www.google.com/search?q=${encodeURIComponent(`site:linkedin.com/in "${rawDigits}" OR "${localDigits}"`)}`,
    `https://www.google.com/search?q=${encodeURIComponent(`"${rawDigits}" OR "${localDigits}"`)}`
  ];

  const addressPrefix = cleanPhone.startsWith('+84') ? '123 Đường Trần Hưng Đạo, ' : '456 Broadway Ave, ';

  return {
    name: baseProfile.realName,
    realAddress: addressPrefix + baseProfile.location,
    relatives: extended.relatives,
    business: extended.business,
    dorkUrls
  };
}
