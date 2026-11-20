/* Independent Cohabitation service-price MODEL: proposal, not approved rates.
 * Reusable pure function; dollar figures are assumptions unless cited separately.
 * Returns a cost/quote estimate, not a checkout authorization.
 */
export const RATE_USD_PER_COIN=0.01;
export const POLICY=Object.freeze({
 monthWeeks:52/12,apiCopyPerPost:0.12,productionPerPost:1.6,
 imageApiPerAsset:0.10,imageReviewPerAsset:0.55,
 videoApiPerSecond:0.12,videoAttempts:2,videoEditPerClip:4,
 accountMonthlyPerPlatform:3,monthlySupportBase:5,
 commonsFraction:0.10,operationsFraction:0.08,
 targetContributionFraction:0.25,cardFeeFraction:0.029,cardFeeFixed:0.30
});
export function quoteSocial(input,p=POLICY){
const bound=(v,min,max)=>Math.min(max,Math.max(min,Math.floor(Number(v)||0)));
const postsWeek=bound(input.postsWeek,0,30);
const videosMonth=bound(input.videosMonth,0,25);
const imagesMonth=bound(input.imagesMonth,0,100);
const platforms=bound(input.platforms,1,5);
const videoSeconds=bound(input.videoSeconds||10,5,60);
const budget=Math.min(5000,Math.max(0,Number(input.budget)||0));
const postCount=Math.ceil(postsWeek*p.monthWeeks);
const lines=[
{label:"Post writing, edits & QA",qty:postCount,unit:p.productionPerPost+p.apiCopyPerPost},
{label:"Image generation, design & QA",qty:imagesMonth,unit:p.imageApiPerAsset+p.imageReviewPerAsset},
{label:"AI video generation and editing",qty:videosMonth,unit:videoSeconds*p.videoApiPerSecond*p.videoAttempts+p.videoEditPerClip},
{label:"Publishing & account connections",qty:platforms,unit:p.accountMonthlyPerPlatform},
{label:"Planning and support",qty:1,unit:p.monthlySupportBase}
].map(l=>({...l,usd:Number((l.qty*l.unit).toFixed(2))}));
const variable=lines.reduce((s,l)=>s+l.usd,0);
const denom=1-p.commonsFraction-p.operationsFraction-p.targetContributionFraction-p.cardFeeFraction;
if(denom<=0) throw Error("Allocation policy leaves no room for direct costs");
const minimumQuote=Math.max(0,Math.ceil((variable+p.cardFeeFixed)/denom));
const fits=minimumQuote<=budget;
function split(price){const commons=price*p.commonsFraction;const operations=price*p.operationsFraction;const card=price*p.cardFeeFraction+p.cardFeeFixed;const contribution=price-variable-commons-operations-card;return {price,commons,operations,card,variable,contribution,contributionPct:price?contribution/price:0,coinAmount:Math.ceil(price/RATE_USD_PER_COIN)};}
return {inputs:{postsWeek,videosMonth,imagesMonth,platforms,videoSeconds,budget},postCount,lines,minimumQuote,fits,atQuote:split(minimumQuote),atBudget:split(budget),policy:p,disclaimer:"Estimate only. No real account, pricing approval, live API usage metering or checkout."};
}
export const REWARD_DRAFT=[
{action:"Signup verification, one-time",regular:25,cooperative:25,note:"One per verified identity, fraud guarded"},
{action:"Original eligible post",regular:1,cooperative:2,note:"Daily caps and quality limits"},
{action:"Constructive eligible comment",regular:1,cooperative:2,note:"Daily capped; no duplicate spam"},
{action:"Heart or reaction",regular:0,cooperative:0,note:"No direct reward to avoid like farming"},
{action:"Distinct share with permission",regular:1,cooperative:2,note:"One per item per period; no spam"},
{action:"Approved original art upload",regular:5,cooperative:8,note:"Ownership, license and duplication checks"},
{action:"Approved usable audio sample",regular:5,cooperative:8,note:"Metadata, rights, key/BPM review"},
{action:"Approved original video upload",regular:5,cooperative:8,note:"Human review and daily cap"},
{action:"Monthly cooperative member distribution",regular:0,cooperative:100,note:"Only if funded by actual membership revenue"}
];
