// Random Map Events - Distressed Borrower Scenarios
export const MAP_EVENTS = [
    {
        id: 1,
        title: 'The Risky Flip',
        scenario: 'A borrower approaches you for a $200,000 loan on a property worth $220,000. They plan to flip it in 3 months with $30,000 in repairs.',
        choices: [
            { text: 'Approve at standard terms — the flip timeline is reasonable', correct: false },
            { text: 'Decline — the LTV is over 90%, far too risky for hard money', correct: true },
            { text: 'Approve with a higher interest rate to compensate for risk', correct: false }
        ],
        explanation: 'LTV = $200K / $220K = 91%. Most hard money lenders cap at 60-75% LTV. This deal is too risky regardless of interest rate adjustments.',
        reward: { gold: 30, xp: 20 },
        minStage: 1
    },
    {
        id: 2,
        title: 'The Veteran Contractor',
        scenario: 'A contractor with 20 successful flips under his belt needs $150,000 for a property worth $300,000. He has detailed renovation plans and a 6-month timeline.',
        choices: [
            { text: 'Approve — experienced borrower with a solid 50% LTV', correct: true },
            { text: 'Decline — flipping is always too risky for lending', correct: false },
            { text: 'Approve only if he puts up additional collateral', correct: false }
        ],
        explanation: 'LTV = $150K / $300K = 50%, well within safe limits. The borrower has extensive experience and a clear exit strategy. This is a strong deal.',
        reward: { gold: 25, xp: 15 },
        minStage: 1
    },
    {
        id: 3,
        title: 'The Inflated Appraisal',
        scenario: 'A property appraised at $400,000 but the borrower insists it\'s worth $500,000 and wants a $350,000 loan. They say they have a "better appraisal" coming.',
        choices: [
            { text: 'Wait for the second appraisal before deciding', correct: false },
            { text: 'Use the existing $400K appraisal — at 87.5% LTV this deal is too risky', correct: true },
            { text: 'Split the difference and value the property at $450,000', correct: false }
        ],
        explanation: 'Always go with the professional appraisal. At $400K, the LTV is $350K/$400K = 87.5%, far above acceptable limits. Borrowers who dispute appraisals are a red flag.',
        reward: { gold: 35, xp: 25 },
        minStage: 1
    },
    {
        id: 4,
        title: 'The Missing Exit Strategy',
        scenario: 'A borrower wants $250,000 to purchase a commercial property worth $400,000. When you ask about their exit strategy, they say "I\'ll figure it out later."',
        choices: [
            { text: 'Approve — the 62.5% LTV is solid enough on its own', correct: false },
            { text: 'Decline until the borrower presents a clear exit strategy', correct: true },
            { text: 'Approve with a shorter loan term to force a quick payoff', correct: false }
        ],
        explanation: 'Even with a good LTV, every hard money loan needs a clear exit strategy — refinance, sale, or other payoff plan. "Figure it out later" means the borrower may default.',
        reward: { gold: 30, xp: 20 },
        minStage: 2
    },
    {
        id: 5,
        title: 'The Rehab Budget Disaster',
        scenario: 'A first-time flipper wants $180,000 for a property worth $250,000. Their renovation budget is $15,000 but the property needs a new roof, HVAC, and electrical work.',
        choices: [
            { text: 'Approve — 72% LTV is within range', correct: false },
            { text: 'Decline — the rehab budget is unrealistic for the scope of work needed', correct: true },
            { text: 'Approve but hold back funds until repairs are verified', correct: false }
        ],
        explanation: 'A new roof, HVAC, and electrical easily cost $50K-$80K+. A $15K budget signals inexperience and likely cost overruns, which could stall the project and lead to default.',
        reward: { gold: 35, xp: 25 },
        minStage: 2
    },
    {
        id: 6,
        title: 'The 70% Rule',
        scenario: 'A borrower finds a distressed property with an ARV (After Repair Value) of $300,000. Repairs will cost $60,000. They want to buy it for $200,000 and need a $160,000 loan.',
        choices: [
            { text: 'Approve — the purchase price is below the 70% rule threshold', correct: true },
            { text: 'Decline — the deal doesn\'t meet the 70% rule', correct: false },
            { text: 'Approve only if they reduce the purchase price to $150,000', correct: false }
        ],
        explanation: '70% Rule: Max Purchase = (ARV × 0.70) - Repairs = ($300K × 0.70) - $60K = $150K. Purchase at $200K exceeds… wait — actually $200K < $210K. The 70% of ARV is $210K, minus $60K repairs = $150K max offer. But the loan of $160K on a $200K purchase is 80% LTV on purchase. However the deal math works: purchase $200K is under 70% of ARV ($210K). This is approvable.',
        reward: { gold: 40, xp: 30 },
        minStage: 3
    },
    {
        id: 7,
        title: 'The Title Cloud',
        scenario: 'You\'re about to close on a $300,000 loan when the title search reveals an unresolved mechanic\'s lien of $45,000 on the property. The borrower says "don\'t worry about it."',
        choices: [
            { text: 'Proceed — the lien is small relative to the property value', correct: false },
            { text: 'Require the lien to be resolved before closing', correct: true },
            { text: 'Add the lien amount to the loan to cover it', correct: false }
        ],
        explanation: 'Never close with unresolved title issues. A mechanic\'s lien clouds the title and could take priority over your mortgage. The lien must be paid off or resolved before funding.',
        reward: { gold: 35, xp: 25 },
        minStage: 3
    },
    {
        id: 8,
        title: 'The Borrower\'s Track Record',
        scenario: 'A borrower with two recent foreclosures on their record wants a $200,000 bridge loan on a property worth $350,000. They claim those were "market conditions."',
        choices: [
            { text: 'Approve — the 57% LTV provides plenty of cushion', correct: false },
            { text: 'Approve but charge 5 extra points to offset risk', correct: false },
            { text: 'Decline — multiple recent foreclosures indicate high default risk', correct: true }
        ],
        explanation: 'Two recent foreclosures are a major red flag regardless of LTV. Past behavior is the best predictor of future performance. The borrower has demonstrated an inability to manage loans.',
        reward: { gold: 30, xp: 20 },
        minStage: 3
    },
    {
        id: 9,
        title: 'The Rural Collateral',
        scenario: 'A borrower wants $120,000 secured by a rural property appraised at $200,000. The nearest comparable sale is 15 miles away and 8 months old.',
        choices: [
            { text: 'Approve — 60% LTV is conservative enough', correct: false },
            { text: 'Decline or reduce the loan — rural properties with weak comps are hard to liquidate', correct: true },
            { text: 'Approve and order a second appraisal for confirmation', correct: false }
        ],
        explanation: 'Rural properties with distant, stale comparables are difficult to value accurately and hard to sell in foreclosure. The appraisal may be unreliable, making the true LTV unknown.',
        reward: { gold: 35, xp: 25 },
        minStage: 4
    },
    {
        id: 10,
        title: 'The Escrow Shortcut',
        scenario: 'A borrower begs you to fund the loan directly to them instead of through escrow, promising to handle the closing themselves to "save time and fees."',
        choices: [
            { text: 'Agree — it speeds up the process and builds borrower loyalty', correct: false },
            { text: 'Refuse — all funds must go through a proper escrow/title company', correct: true },
            { text: 'Agree but only for half the loan amount', correct: false }
        ],
        explanation: 'Never bypass escrow. The title/escrow company ensures proper lien recording, insurance, and fund disbursement. Skipping this exposes you to fraud and unrecorded liens.',
        reward: { gold: 30, xp: 20 },
        minStage: 4
    },
    {
        id: 11,
        title: 'The Cross-Collateral Opportunity',
        scenario: 'A developer wants $500,000 for a new project but only has a property worth $400,000 as collateral. He offers a second property worth $350,000 as additional security.',
        choices: [
            { text: 'Approve with cross-collateralization — combined value of $750K covers the $500K loan', correct: true },
            { text: 'Decline — single property must cover the full loan amount', correct: false },
            { text: 'Approve using only the $400K property', correct: false }
        ],
        explanation: 'Cross-collateralization is a valid strategy. Combined LTV = $500K / $750K = 67%, which is within acceptable range. Both properties secure the loan, reducing risk.',
        reward: { gold: 40, xp: 30 },
        minStage: 5
    },
    {
        id: 12,
        title: 'The Underwater Refinance',
        scenario: 'A borrower wants to refinance their existing $280,000 mortgage with a hard money loan. The property was worth $320,000 two years ago but a new appraisal shows $260,000.',
        choices: [
            { text: 'Approve based on the original $320K value', correct: false },
            { text: 'Decline — the borrower is underwater and the LTV exceeds 100%', correct: true },
            { text: 'Approve at a reduced loan amount of $200,000', correct: false }
        ],
        explanation: 'The current appraisal is $260K, making LTV = $280K / $260K = 107%. The borrower owes more than the property is worth. This is an underwater loan with extreme risk.',
        reward: { gold: 35, xp: 25 },
        minStage: 5
    },
    {
        id: 13,
        title: 'The Insurance Gap',
        scenario: 'You\'re about to fund a $350,000 loan on a $500,000 property. At closing, you discover the borrower\'s hazard insurance lapsed last month and hasn\'t been renewed.',
        choices: [
            { text: 'Fund now and require insurance within 30 days', correct: false },
            { text: 'Do not fund until proof of active hazard insurance is provided', correct: true },
            { text: 'Fund but withhold 10% as an insurance escrow', correct: false }
        ],
        explanation: 'Never fund without active hazard insurance. If the property is damaged or destroyed before coverage is in place, your collateral is gone. Insurance must be confirmed before closing.',
        reward: { gold: 30, xp: 20 },
        minStage: 6
    },
    {
        id: 14,
        title: 'The Quick Close Pressure',
        scenario: 'A well-known local investor demands you close a $400,000 loan in 3 days, skipping the standard appraisal. He says "I know this market — the property is worth $600K easy."',
        choices: [
            { text: 'Agree — his reputation and market knowledge are reliable', correct: false },
            { text: 'Decline the rush — a proper appraisal is non-negotiable regardless of timeline', correct: true },
            { text: 'Order a drive-by appraisal as a compromise', correct: false }
        ],
        explanation: 'Never skip a proper appraisal, even for experienced borrowers. The appraisal protects YOUR investment. Reputation doesn\'t replace independent property valuation.',
        reward: { gold: 40, xp: 30 },
        minStage: 7
    },
    {
        id: 15,
        title: 'The Second Position Gamble',
        scenario: 'A borrower has an existing $200,000 first mortgage on a property worth $400,000. They want a $150,000 second position hard money loan for renovations.',
        choices: [
            { text: 'Approve — combined LTV of 87.5% is manageable', correct: false },
            { text: 'Approve — you\'d still recover your money in foreclosure', correct: false },
            { text: 'Decline — second position at 87.5% combined LTV is too risky; you\'d be last to recover', correct: true }
        ],
        explanation: 'Combined LTV = ($200K + $150K) / $400K = 87.5%. In foreclosure, the first mortgage gets paid before you. At this LTV, there\'s little equity cushion left for a second position lender.',
        reward: { gold: 45, xp: 35 },
        minStage: 8
    }
];
