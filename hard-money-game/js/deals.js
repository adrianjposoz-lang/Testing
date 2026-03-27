// Deal Simulator - Full Loan Underwriting Scenarios
export const DEAL_SCENARIOS = [
    {
        id: 1,
        title: 'The Starter Flip',
        difficulty: 'easy',
        property: {
            address: '123 Oak Street',
            type: 'Single Family Home',
            currentValue: 180000,
            arv: 260000,
            repairCost: 45000,
            condition: 'Needs new kitchen, bathroom update, and paint'
        },
        borrower: {
            name: 'Mike Chen',
            experience: '3 successful flips in the past 2 years',
            creditScore: 680,
            cashReserves: 50000,
            skinInTheGame: 35000
        },
        loanRequest: {
            amount: 150000,
            purpose: 'Purchase and rehab',
            exitStrategy: 'Renovate and sell within 6 months',
            term: 12
        },
        questions: [
            {
                question: 'What is the LTV based on current value?',
                options: ['65%', '72%', '83%', '92%'],
                correctIndex: 2,
                explanation: 'LTV = $150,000 / $180,000 = 83.3%'
            },
            {
                question: 'What is the LTV based on ARV?',
                options: ['45%', '58%', '69%', '75%'],
                correctIndex: 1,
                explanation: 'LTARV = $150,000 / $260,000 = 57.7%'
            },
            {
                question: 'Using the 70% rule, what is the max purchase price?',
                options: ['$137,000', '$152,000', '$182,000', '$210,000'],
                correctIndex: 0,
                explanation: '70% Rule: ($260,000 × 0.70) - $45,000 = $182,000 - $45,000 = $137,000'
            },
            {
                question: 'Should you approve this loan?',
                options: ['Approve — solid deal with experienced borrower', 'Approve with conditions — reduce loan to $130K', 'Decline — LTV too high based on current value'],
                correctIndex: 1,
                explanation: 'The deal is promising with good ARV, but current LTV of 83% is high. Reducing the loan to ~$130K brings LTV to 72%, safer for the lender while still workable for the borrower.'
            }
        ],
        summary: 'This deal has potential but requires careful structuring. The borrower is experienced, ARV supports the deal, but current value LTV needs to be managed.'
    },
    {
        id: 2,
        title: 'The Clear Winner',
        difficulty: 'easy',
        property: {
            address: '456 Maple Drive',
            type: 'Single Family Home',
            currentValue: 320000,
            arv: 420000,
            repairCost: 55000,
            condition: 'Cosmetic updates needed — flooring, paint, landscaping'
        },
        borrower: {
            name: 'Sarah Johnson',
            experience: '10 flips completed, all profitable',
            creditScore: 720,
            cashReserves: 85000,
            skinInTheGame: 60000
        },
        loanRequest: {
            amount: 200000,
            purpose: 'Purchase and light rehab',
            exitStrategy: 'Renovate and sell within 4 months',
            term: 6
        },
        questions: [
            {
                question: 'What is the LTV based on current value?',
                options: ['52%', '63%', '71%', '80%'],
                correctIndex: 1,
                explanation: 'LTV = $200,000 / $320,000 = 62.5%'
            },
            {
                question: 'How would you rate this borrower profile?',
                options: ['High risk — credit score is too low', 'Moderate — needs more cash reserves', 'Strong — experienced with good financials', 'Insufficient data to assess'],
                correctIndex: 2,
                explanation: '10 profitable flips, 720 credit score, $85K reserves, and $60K skin in the game. This is a strong borrower.'
            },
            {
                question: 'Should you approve this loan?',
                options: ['Approve — strong borrower, conservative LTV, clear exit', 'Decline — cosmetic-only flips are too speculative', 'Approve only with cross-collateral'],
                correctIndex: 0,
                explanation: '62.5% LTV, experienced borrower, strong reserves, short timeline, cosmetic rehab = low risk. This is an ideal hard money deal.'
            }
        ],
        summary: 'A textbook good deal. Low LTV, experienced borrower, strong exit strategy, and conservative rehab scope. This is the kind of deal lenders love.'
    },
    {
        id: 3,
        title: 'The Red Flag Rookie',
        difficulty: 'easy',
        property: {
            address: '789 Elm Court',
            type: 'Single Family Home',
            currentValue: 150000,
            arv: 200000,
            repairCost: 70000,
            condition: 'Major structural issues — foundation cracks, roof replacement, mold remediation'
        },
        borrower: {
            name: 'Dave Wilson',
            experience: 'First-time flipper, watched online courses',
            creditScore: 580,
            cashReserves: 8000,
            skinInTheGame: 5000
        },
        loanRequest: {
            amount: 140000,
            purpose: 'Purchase and full rehab',
            exitStrategy: 'Fix and sell, timeline unknown',
            term: 12
        },
        questions: [
            {
                question: 'What is the LTV based on current value?',
                options: ['75%', '83%', '93%', '100%'],
                correctIndex: 2,
                explanation: 'LTV = $140,000 / $150,000 = 93.3%'
            },
            {
                question: 'What is the biggest red flag with this borrower?',
                options: ['Credit score below 600', 'No real experience — only online courses', 'Cash reserves of only $8,000 for a $70K rehab', 'All of the above'],
                correctIndex: 3,
                explanation: 'Every indicator is a red flag: no experience, terrible credit, barely any reserves for a major rehab, and minimal skin in the game.'
            },
            {
                question: 'Should you approve this loan?',
                options: ['Approve — the ARV supports the deal', 'Approve with a higher rate to offset risk', 'Decline — too many red flags across the board'],
                correctIndex: 2,
                explanation: '93% LTV, zero experience, low credit, insufficient reserves for a $70K rehab, and no clear timeline. This deal would almost certainly result in default.'
            }
        ],
        summary: 'A classic deal to decline. High LTV, inexperienced borrower, insufficient capital, and structural issues that require expertise. No amount of rate adjustment fixes these fundamentals.'
    },
    {
        id: 4,
        title: 'The Bridge Loan',
        difficulty: 'medium',
        property: {
            address: '221 River Road',
            type: 'Commercial — Small Retail',
            currentValue: 550000,
            arv: 550000,
            repairCost: 0,
            condition: 'Good condition, currently leased to tenant'
        },
        borrower: {
            name: 'Priya Patel',
            experience: 'Owns 4 rental properties, no flips',
            creditScore: 700,
            cashReserves: 120000,
            skinInTheGame: 100000
        },
        loanRequest: {
            amount: 385000,
            purpose: 'Bridge loan — refinancing from another hard money lender',
            exitStrategy: 'Secure conventional financing within 6 months',
            term: 12
        },
        questions: [
            {
                question: 'What is the LTV?',
                options: ['55%', '62%', '70%', '78%'],
                correctIndex: 2,
                explanation: 'LTV = $385,000 / $550,000 = 70%'
            },
            {
                question: 'What is the primary risk with this bridge loan?',
                options: ['The property is commercial', 'The borrower may not qualify for conventional refinancing', 'The property has no ARV upside', 'The borrower has no flip experience'],
                correctIndex: 1,
                explanation: 'The exit strategy depends on qualifying for conventional financing. If the borrower can\'t refinance, they may default. Always verify the refinance is realistic.'
            },
            {
                question: 'What due diligence should you prioritize?',
                options: ['Property inspection', 'Verify the borrower can realistically qualify for conventional refinancing', 'Check comparable property sales', 'Review the tenant lease terms'],
                correctIndex: 1,
                explanation: 'Since the exit strategy is a conventional refinance, confirming the borrower\'s ability to qualify is critical. If they can\'t refinance, there\'s no clear payoff path.'
            },
            {
                question: 'Should you approve this loan?',
                options: ['Approve — 70% LTV with income-producing property', 'Approve with condition — verify conventional loan pre-qualification first', 'Decline — bridge loans are always too risky'],
                correctIndex: 1,
                explanation: 'The deal is reasonable at 70% LTV with a good borrower, but you must verify the exit strategy. Require proof of conventional loan pre-qualification before funding.'
            }
        ],
        summary: 'Bridge loans can be profitable but the exit strategy is everything. Always verify that the borrower can realistically execute their refinance plan before committing funds.'
    },
    {
        id: 5,
        title: 'The Multi-Family Opportunity',
        difficulty: 'medium',
        property: {
            address: '88 Park Avenue',
            type: 'Duplex',
            currentValue: 280000,
            arv: 380000,
            repairCost: 60000,
            condition: 'Both units need full kitchen/bath remodel'
        },
        borrower: {
            name: 'James & Maria Torres',
            experience: '5 flips, 2 rental properties owned',
            creditScore: 695,
            cashReserves: 75000,
            skinInTheGame: 55000
        },
        loanRequest: {
            amount: 210000,
            purpose: 'Purchase and rehab both units',
            exitStrategy: 'Rehab and hold as rental — refinance to conventional in 12 months',
            term: 18
        },
        questions: [
            {
                question: 'What is the LTV based on current value?',
                options: ['65%', '72%', '75%', '82%'],
                correctIndex: 2,
                explanation: 'LTV = $210,000 / $280,000 = 75%'
            },
            {
                question: 'What is the LTARV (Loan-to-ARV)?',
                options: ['48%', '55%', '63%', '71%'],
                correctIndex: 1,
                explanation: 'LTARV = $210,000 / $380,000 = 55.3%'
            },
            {
                question: 'Does the rehab budget seem realistic for two full kitchen/bath remodels?',
                options: ['Yes — $30K per unit is reasonable', 'No — $60K is far too low for two full remodels', 'Cannot determine without contractor bids', 'Only if they do the work themselves'],
                correctIndex: 0,
                explanation: '$30,000 per unit for kitchen and bathroom remodel is within a reasonable range, especially for a duplex. Not luxury finishes but solid investor-grade rehab.'
            },
            {
                question: 'Should you approve this loan?',
                options: ['Approve — experienced team, good LTV, realistic budget', 'Decline — 75% LTV is too high', 'Approve only if they sell instead of hold'],
                correctIndex: 0,
                explanation: '75% current LTV, 55% LTARV, experienced borrowers with rental portfolio, realistic budget, and strong exit via refinance. This is an approvable deal.'
            }
        ],
        summary: 'A solid multi-family deal. The borrowers have both flip and rental experience, the numbers work, and the exit strategy aligns with their portfolio goals.'
    },
    {
        id: 6,
        title: 'The Teardown Gamble',
        difficulty: 'medium',
        property: {
            address: '55 Sunset Blvd',
            type: 'Vacant Land (with teardown structure)',
            currentValue: 190000,
            arv: 450000,
            repairCost: 220000,
            condition: 'Structure condemned — land value only; new construction required'
        },
        borrower: {
            name: 'Roberto Vega',
            experience: '2 ground-up builds completed',
            creditScore: 660,
            cashReserves: 100000,
            skinInTheGame: 70000
        },
        loanRequest: {
            amount: 300000,
            purpose: 'Land purchase and new construction',
            exitStrategy: 'Build and sell new single family home',
            term: 18
        },
        questions: [
            {
                question: 'What is the LTV based on current (land) value?',
                options: ['95%', '118%', '158%', '200%'],
                correctIndex: 2,
                explanation: 'LTV = $300,000 / $190,000 = 157.9%. The loan exceeds the current land value.'
            },
            {
                question: 'What is the LTARV?',
                options: ['52%', '58%', '67%', '73%'],
                correctIndex: 2,
                explanation: 'LTARV = $300,000 / $450,000 = 66.7%. Based on completed value, the ratio is acceptable.'
            },
            {
                question: 'What is the key risk with construction loans?',
                options: ['Construction always costs more than estimated', 'The borrower could abandon the project mid-build', 'Both cost overruns and project abandonment are major risks', 'Construction loans have no special risks'],
                correctIndex: 2,
                explanation: 'Construction loans carry unique risks: cost overruns, delays, contractor issues, and the possibility of abandonment leaving an unfinished property with minimal value.'
            },
            {
                question: 'How should you structure the funding?',
                options: ['Fund the full $300K at closing', 'Use a draw schedule — release funds in stages as construction milestones are met', 'Fund half now and half at completion', 'Let the borrower manage fund disbursement'],
                correctIndex: 1,
                explanation: 'Construction loans should always use a draw schedule. Funds are released as work is completed and verified, protecting the lender from cost overruns and abandonment.'
            },
            {
                question: 'Should you approve this loan?',
                options: ['Approve with draw schedule — LTARV is acceptable with experienced builder', 'Decline — LTV on current value is way over 100%', 'Approve only if borrower puts up additional collateral'],
                correctIndex: 0,
                explanation: 'While current LTV is high (expected for construction), the LTARV of 67% is acceptable. The borrower has construction experience. A draw schedule mitigates risk.'
            }
        ],
        summary: 'Construction loans require different evaluation — LTARV matters more than current LTV. Draw schedules, builder experience, and detailed budgets are essential risk controls.'
    },
    {
        id: 7,
        title: 'The Distressed Seller',
        difficulty: 'hard',
        property: {
            address: '912 Foreclosure Lane',
            type: 'Single Family Home',
            currentValue: 240000,
            arv: 340000,
            repairCost: 65000,
            condition: 'Pre-foreclosure — seller behind 4 months on payments'
        },
        borrower: {
            name: 'Kevin O\'Brien',
            experience: '8 flips, specializes in foreclosure properties',
            creditScore: 710,
            cashReserves: 95000,
            skinInTheGame: 50000
        },
        loanRequest: {
            amount: 175000,
            purpose: 'Purchase at foreclosure discount',
            exitStrategy: 'Rehab and sell within 5 months',
            term: 9
        },
        questions: [
            {
                question: 'What is the LTV based on current value?',
                options: ['63%', '68%', '73%', '79%'],
                correctIndex: 2,
                explanation: 'LTV = $175,000 / $240,000 = 72.9%'
            },
            {
                question: 'What additional due diligence is critical for a pre-foreclosure purchase?',
                options: ['Verify all existing liens, back taxes, and encumbrances on the property', 'Check the borrower\'s social media', 'Only a standard appraisal is needed', 'Verify the seller\'s employment history'],
                correctIndex: 0,
                explanation: 'Pre-foreclosure properties often have hidden liens, back taxes, HOA dues, and other encumbrances that increase true acquisition cost and complicate title.'
            },
            {
                question: 'Using the 70% rule, is the purchase price reasonable?',
                options: ['Yes — max price is $173K, close to the deal', 'No — max price is $238K, well above the deal', 'Cannot apply the 70% rule here', 'Yes — max price is $190K, deal is below'],
                correctIndex: 0,
                explanation: '70% Rule: ($340,000 × 0.70) - $65,000 = $238,000 - $65,000 = $173,000. The $175K purchase is slightly above but very close to the 70% rule threshold.'
            },
            {
                question: 'Should you approve this loan?',
                options: ['Approve — experienced foreclosure specialist, reasonable LTV', 'Decline — pre-foreclosure properties are never worth the risk', 'Approve with condition — require clear title search and lien verification first'],
                correctIndex: 2,
                explanation: 'The deal metrics are solid, but pre-foreclosure properties demand thorough title work. Approve contingent on clean title and full lien disclosure.'
            }
        ],
        summary: 'Foreclosure deals can be excellent investments but require extra due diligence on title and liens. The borrower\'s specialization is a plus, but title clarity is non-negotiable.'
    },
    {
        id: 8,
        title: 'The Mixed-Use Maze',
        difficulty: 'hard',
        property: {
            address: '200 Main Street',
            type: 'Mixed-Use (Retail + 2 Apartments)',
            currentValue: 480000,
            arv: 600000,
            repairCost: 90000,
            condition: 'Retail space needs build-out; apartments need cosmetic updates'
        },
        borrower: {
            name: 'Linda & Robert Chang',
            experience: '12 residential flips, first commercial project',
            creditScore: 735,
            cashReserves: 150000,
            skinInTheGame: 100000
        },
        loanRequest: {
            amount: 350000,
            purpose: 'Purchase and renovation',
            exitStrategy: 'Lease all units, refinance to commercial loan in 18 months',
            term: 24
        },
        questions: [
            {
                question: 'What is the LTV based on current value?',
                options: ['63%', '68%', '73%', '80%'],
                correctIndex: 2,
                explanation: 'LTV = $350,000 / $480,000 = 72.9%'
            },
            {
                question: 'What concern does the borrower profile raise?',
                options: ['Credit score is too low for commercial', 'They have no commercial property experience', 'Their cash reserves are insufficient', 'They have too many existing properties'],
                correctIndex: 1,
                explanation: 'While they\'re experienced residential flippers, this is their first commercial project. Commercial properties have different challenges: zoning, commercial leases, tenant build-outs, and different appraisal methods.'
            },
            {
                question: 'What makes the exit strategy risky?',
                options: ['18-month refinance timeline is too short', 'Commercial refinance requires stabilized income — all units must be leased', 'Commercial loans don\'t exist for mixed-use', 'Residential experience counts for commercial refinance'],
                correctIndex: 1,
                explanation: 'Commercial refinance lenders require stabilized NOI (Net Operating Income). If the units aren\'t leased and producing income, the conventional refinance won\'t happen.'
            },
            {
                question: 'Should you approve this loan?',
                options: ['Approve — strong financials override the experience gap', 'Approve with conditions — require commercial property management and leasing plan', 'Decline — residential investors shouldn\'t do commercial deals'],
                correctIndex: 1,
                explanation: 'The numbers work and the borrowers are financially strong, but their lack of commercial experience is a real risk. Require a professional property management plan and detailed leasing timeline.'
            }
        ],
        summary: 'Experience matters by property type. Strong residential investors can succeed in commercial, but they need proper support systems. Conditional approval with guardrails is the smart play.'
    },
    {
        id: 9,
        title: 'The Hidden Gem or Money Pit',
        difficulty: 'hard',
        property: {
            address: '777 Lucky Lane',
            type: 'Single Family Home',
            currentValue: 130000,
            arv: 310000,
            repairCost: 120000,
            condition: 'Fire-damaged — needs extensive structural repair, new electrical, plumbing, HVAC, interior rebuild'
        },
        borrower: {
            name: 'Tony Martinez',
            experience: '15 flips including 3 fire-damaged properties',
            creditScore: 690,
            cashReserves: 200000,
            skinInTheGame: 80000
        },
        loanRequest: {
            amount: 185000,
            purpose: 'Purchase and full reconstruction',
            exitStrategy: 'Complete rebuild and sell within 8 months',
            term: 12
        },
        questions: [
            {
                question: 'What is the LTV based on current value?',
                options: ['105%', '120%', '142%', '155%'],
                correctIndex: 2,
                explanation: 'LTV = $185,000 / $130,000 = 142.3%. The loan far exceeds the current damaged property value.'
            },
            {
                question: 'What is the LTARV?',
                options: ['48%', '55%', '60%', '68%'],
                correctIndex: 2,
                explanation: 'LTARV = $185,000 / $310,000 = 59.7%'
            },
            {
                question: 'Does the 70% rule support this deal?',
                options: ['Yes — max purchase is $97K, deal at $130K fails', 'No — max purchase is $97K, purchase price exceeds it', 'Yes — max purchase is $217K, well above purchase price', 'Cannot apply 70% rule to fire damage'],
                correctIndex: 1,
                explanation: '70% Rule: ($310K × 0.70) - $120K = $217K - $120K = $97K. The purchase at $130K exceeds the 70% rule max of $97K. However, the borrower\'s fire-damage expertise may justify a slight premium.'
            },
            {
                question: 'What is the most critical factor in your decision?',
                options: ['The current LTV of 142%', 'The borrower\'s specific experience with fire-damaged properties', 'The credit score of 690', 'The 8-month timeline'],
                correctIndex: 1,
                explanation: 'Fire-damaged rebuilds are highly specialized. The borrower\'s track record of 3 successful fire-damage rehabs is the single most important factor — it demonstrates they can execute this specific type of project.'
            },
            {
                question: 'Should you approve this loan?',
                options: ['Decline — current LTV over 140% is unacceptable', 'Approve with draw schedule — specialist borrower, 60% LTARV, strong reserves', 'Approve at full funding — the borrower is experienced enough'],
                correctIndex: 1,
                explanation: 'Despite the high current LTV, the LTARV of 60% is strong. The borrower is a fire-damage specialist with $200K reserves. A draw schedule protects against cost overruns on this complex rehab.'
            }
        ],
        summary: 'Specialized deals require specialized borrowers. Current value is misleading for major rehabs — LTARV and borrower expertise are better indicators. Draw schedules are essential for large-scope projects.'
    },
    {
        id: 10,
        title: 'The Portfolio Play',
        difficulty: 'hard',
        property: {
            address: '3 Properties — 10, 12, 14 Cedar Ave',
            type: 'Portfolio — 3 Single Family Homes',
            currentValue: 600000,
            arv: 840000,
            repairCost: 150000,
            condition: 'All three need moderate rehab — kitchens, baths, roofing on unit 3'
        },
        borrower: {
            name: 'Apex Investments LLC (Principal: Diana Ross)',
            experience: '25+ flips, 8 current rental properties, established LLC',
            creditScore: 750,
            cashReserves: 300000,
            skinInTheGame: 150000
        },
        loanRequest: {
            amount: 420000,
            purpose: 'Purchase all 3 properties as a package',
            exitStrategy: 'Rehab and sell individually over 6-9 months',
            term: 12
        },
        questions: [
            {
                question: 'What is the portfolio LTV based on combined current value?',
                options: ['58%', '65%', '70%', '78%'],
                correctIndex: 2,
                explanation: 'Portfolio LTV = $420,000 / $600,000 = 70%'
            },
            {
                question: 'What is the portfolio LTARV?',
                options: ['42%', '50%', '58%', '65%'],
                correctIndex: 1,
                explanation: 'LTARV = $420,000 / $840,000 = 50%'
            },
            {
                question: 'What is the advantage of portfolio lending in this case?',
                options: ['Lower closing costs for the lender', 'Cross-collateralization — all 3 properties secure the full loan', 'Portfolio loans have lower interest rates', 'No advantage — each property should be separate'],
                correctIndex: 1,
                explanation: 'With cross-collateralization, all three properties secure the entire loan. If one property underperforms, the others still provide security. This reduces overall risk.'
            },
            {
                question: 'What is the per-property average loan amount, and is it reasonable?',
                options: ['$140K avg — reasonable for $200K avg value properties', '$140K avg — too high for the property values', '$105K avg — very conservative', '$210K avg — aggressive but acceptable'],
                correctIndex: 0,
                explanation: 'Average loan per property = $420K / 3 = $140K. Average current value = $600K / 3 = $200K. Per-property LTV of 70% is consistent and reasonable.'
            },
            {
                question: 'Should you approve this loan?',
                options: ['Approve — experienced LLC, strong LTV, cross-collateralized, excellent reserves', 'Decline — too much concentration risk in one borrower', 'Approve only for 2 of the 3 properties'],
                correctIndex: 0,
                explanation: 'This is a strong deal: 70% LTV, 50% LTARV, extremely experienced borrower with an established LLC, $300K reserves, and $150K skin in the game. Cross-collateralization adds security.'
            }
        ],
        summary: 'Portfolio deals with experienced investors can be excellent opportunities. Cross-collateralization, strong reserves, and proven track records make this a model deal for hard money lending.'
    }
];
