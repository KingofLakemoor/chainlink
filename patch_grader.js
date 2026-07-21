import fs from 'fs';
let content = fs.readFileSync('src/services/propGrader.ts', 'utf8');

const target1 = `                // MLB mapping
                if (config.statType === 'STRIKEOUTS') targetIdx = labels.findIndex((l: string) => l === 'K');
                if (config.statType === 'HITS') targetIdx = labels.findIndex((l: string) => l === 'H');
                if (config.statType === 'HOME_RUNS') targetIdx = labels.findIndex((l: string) => l === 'HR');`;

const replace1 = `                const groupType = statGroup.type || statGroup.name;
                
                // MLB mapping
                if (config.statType === 'STRIKEOUTS' && (!groupType || groupType === 'pitching')) targetIdx = labels.findIndex((l: string) => l === 'K');
                if (config.statType === 'HITS' && (!groupType || groupType === 'batting')) targetIdx = labels.findIndex((l: string) => l === 'H');
                if (config.statType === 'HOME_RUNS' && (!groupType || groupType === 'batting')) targetIdx = labels.findIndex((l: string) => l === 'HR');`;

content = content.replace(target1, replace1);

const target2 = `            const valueA = await fetchPlayerStat(m.metadata.optionA, m.metadata.timeframe);
            const valueB = await fetchPlayerStat(m.metadata.optionB, m.metadata.timeframe);
            
            if (valueA !== null && valueB !== null) {
                // Determine if both games are final
                const statusA = await fetchGameStatus(m.metadata.optionA);
                const statusB = await fetchGameStatus(m.metadata.optionB);
                
                let newStatus = 'STATUS_IN_PROGRESS';
                if (statusA === 'STATUS_FINAL' && statusB === 'STATUS_FINAL') {
                    newStatus = 'STATUS_FINAL';
                }
                
                batch.update(doc.ref, {
                    'awayTeam.score': valueA,
                    'homeTeam.score': valueB,
                    status: newStatus
                });
                count++;
                if (newStatus === 'STATUS_FINAL') {
                    matchupsToGrade.push({ id: doc.id, ...m, status: 'STATUS_FINAL', homeTeam: { ...m.homeTeam, score: valueB }, awayTeam: { ...m.awayTeam, score: valueA } });
                }
            }`;

const replace2 = `            const valueA = await fetchPlayerStat(m.metadata.optionA, m.metadata.timeframe);
            const valueB = await fetchPlayerStat(m.metadata.optionB, m.metadata.timeframe);
            
            if (valueA !== null && valueB !== null) {
                // Determine if both games are final
                const statusA = await fetchGameStatus(m.metadata.optionA);
                const statusB = await fetchGameStatus(m.metadata.optionB);
                
                let newStatus = 'STATUS_IN_PROGRESS';
                if (statusA === 'STATUS_FINAL' && statusB === 'STATUS_FINAL') {
                    newStatus = 'STATUS_FINAL';
                }
                
                batch.update(doc.ref, {
                    'awayTeam.score': valueA,
                    'homeTeam.score': valueB,
                    status: newStatus
                });
                count++;
                if (newStatus === 'STATUS_FINAL') {
                    matchupsToGrade.push({ id: doc.id, ...m, status: 'STATUS_FINAL', homeTeam: { ...m.homeTeam, score: valueB }, awayTeam: { ...m.awayTeam, score: valueA } });
                }
            } else if (m.startTime && Date.now() >= m.startTime && m.status === 'STATUS_SCHEDULED') {
                // If games have started by time but boxscore is not ready, update status to lock the prop
                batch.update(doc.ref, { status: 'STATUS_IN_PROGRESS' });
                count++;
            }`;

content = content.replace(target2, replace2);

fs.writeFileSync('src/services/propGrader.ts', content);
console.log("Patched propGrader.ts");
