export const isTeamMatch = (pickName: string, team: any): boolean => {
    if (!pickName || !team) return false;
    const normPick = pickName.trim().toLowerCase();
    const normName = (team.name || '').trim().toLowerCase();
    const normId = (team.id || '').trim().toLowerCase();
    const normShort = (team.shortName || '').trim().toLowerCase();
    const normAbbr = (team.abbreviation || '').trim().toLowerCase();

    if (normName && (normPick === normName || normPick.endsWith(normName) || normName.endsWith(normPick))) {
        return true;
    }
    if (normId && (normPick === normId || normPick.endsWith(normId) || normId.endsWith(normPick))) {
        return true;
    }
    if (normShort && (normPick === normShort || normPick.endsWith(normShort) || normShort.endsWith(normPick))) {
        return true;
    }
    if (normAbbr && (normPick === normAbbr || normPick.endsWith(normAbbr) || normAbbr.endsWith(normPick))) {
        return true;
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
