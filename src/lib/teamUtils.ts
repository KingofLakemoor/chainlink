const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const isTeamMatch = (pickName: string, team: any): boolean => {
    if (!pickName || !team) return false;
    const normPick = (pickName !== null && pickName !== undefined) ? String(pickName).trim().toLowerCase() : '';
    if (!normPick) return false;

    const normName = (team.name !== null && team.name !== undefined) ? String(team.name).trim().toLowerCase() : '';
    const normId = (team.id !== null && team.id !== undefined) ? String(team.id).trim().toLowerCase() : '';
    const normShort = (team.shortName !== null && team.shortName !== undefined) ? String(team.shortName).trim().toLowerCase() : '';
    const normAbbr = (team.abbreviation !== null && team.abbreviation !== undefined) ? String(team.abbreviation).trim().toLowerCase() : '';

    // 1. Exact or delimited ID match
    if (normId) {
        if (normPick === normId) return true;
        const isPickNumeric = /^\d+$/.test(normPick);
        const isIdNumeric = /^\d+$/.test(normId);
        // Numeric IDs must strictly equal each other (preventing e.g. '9' matching '29' via endsWith)
        if (!isPickNumeric || !isIdNumeric) {
            if (normPick.endsWith('_' + normId) || normPick.endsWith('-' + normId) || normPick.endsWith('/' + normId)) return true;
            if (normId.endsWith('_' + normPick) || normId.endsWith('-' + normPick) || normId.endsWith('/' + normPick)) return true;
        }
    }

    // 2. Abbreviation match
    if (normAbbr) {
        if (normPick === normAbbr) return true;
        if (normPick.endsWith('(' + normAbbr + ')') || normPick.endsWith('_' + normAbbr) || normPick.endsWith('-' + normAbbr)) return true;
        const abbrRegex = new RegExp('(?:^|[\\s_\\-(/])' + escapeRegex(normAbbr) + '(?:$|[\\s_\\-)/])', 'i');
        if (abbrRegex.test(normPick)) return true;
    }

    // 3. Short name / Mascot match
    if (normShort) {
        if (normPick === normShort) return true;
        const shortRegex = new RegExp('(?:^|[\\s_\\-])' + escapeRegex(normShort) + '(?:$|[\\s_\\-])', 'i');
        if (shortRegex.test(normPick)) return true;
        const pickRegex = new RegExp('(?:^|[\\s_\\-])' + escapeRegex(normPick) + '(?:$|[\\s_\\-])', 'i');
        if (pickRegex.test(normShort)) return true;
    }

    // 4. Full name match
    if (normName) {
        if (normPick === normName) return true;
        const nameRegex = new RegExp('(?:^|[\\s_\\-])' + escapeRegex(normPick) + '(?:$|[\\s_\\-])', 'i');
        if (nameRegex.test(normName)) return true;
        const pickNameRegex = new RegExp('(?:^|[\\s_\\-])' + escapeRegex(normName) + '(?:$|[\\s_\\-])', 'i');
        if (pickNameRegex.test(normPick)) return true;
    }

    return false;
};

export const getTeamShortName = (m: any, isHome: boolean) => {
    const team = isHome ? m.homeTeam : m.awayTeam;
    let nameToUse = team?.shortName;
    
    // If shortName is missing or is exactly the same as the long name, try to extract from title
    // e.g. title: "Commanders @ Lions" or "Commanders @ Lions - ATS"
    if ((!nameToUse || nameToUse === team?.name) && m.title && m.title.includes(' @ ')) {
        const parts = m.title.split(' - ATS')[0].split(' @ ');
        if (parts.length === 2) {
            const extracted = isHome ? parts[1].trim() : parts[0].trim();
            // Ensure we aren't extracting nonsense by checking if it's a substring of the full name
            if (extracted && (team?.name || '').includes(extracted)) {
                return extracted;
            }
        }
    }
    
    return nameToUse || team?.name || (isHome ? 'Home' : 'Away');
};
