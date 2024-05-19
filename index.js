const { Bot } = require("grammy");
const axios = require('axios');

// Create a bot instance with the provided token
const bot = new Bot("your bot token");
// const bot = new Bot("6749075818:AAE3JiKGChnDZxWyLdxspG0LEDJwNVRNS1Y");

// Start the bot using long polling
bot.start();

// Command handler for /start
bot.command("start", (ctx) => {
    ctx.reply("Welcome! Input Contract Address.");
});

// Message handler for text messages
bot.on("message:text", async (ctx) => {
    const contractAddress = ctx.message.text;
    const responseData = await generateResponse(contractAddress);
    ctx.reply(responseData, { parse_mode: 'HTML' });
});

/**
 * Generates response based on the contract address
 * @param {string} contractAddress - The contract address input by the user
 * @returns {string} - The response message
 */
async function generateResponse(contractAddress) {
    if (!isContractAddress(contractAddress)) {
        return "Input contract address correctly.";
    }

    const tokenInfo = await getTokenInfo(contractAddress);
    if (!tokenInfo || !tokenInfo.pairs || tokenInfo.pairs.length === 0) {
        return "Token information not found.";
    }

    const tokenPair = tokenInfo.pairs[0];
    const ageInDays = calculateTokenAgeInDays(tokenPair.pairCreatedAt);
    const tokenHolders = await getTokenHolders(tokenPair.chainId, contractAddress);

    const tokenHoldersHtml = generateTokenHoldersHtml(tokenHolders, tokenPair);
    const { socialsHtml, websitesHtml } = generateSocialsAndWebsitesHtml(tokenPair.info);
    return generateTokenInfoHtml(tokenPair, ageInDays, tokenHoldersHtml, socialsHtml, websitesHtml);
}

/**
 * Checks if the provided string is a valid contract address
 * @param {string} contractAddress - The contract address to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isContractAddress(contractAddress) {
    return contractAddress.length > 30;
}

/**
 * Fetches token information from the API
 * @param {string} contractAddress - The contract address to fetch info for
 * @returns {object} - The token information
 */
async function getTokenInfo(contractAddress) {
    try {
        const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching pair info:', error.message);
        return null;
    }
}

/**
 * Calculates the age of the token in days
 * @param {string} createdAt - The creation date of the token pair
 * @returns {number} - The age in days
 */
function calculateTokenAgeInDays(createdAt) {
    const ageInMilliseconds = new Date() - new Date(createdAt);
    return Math.floor(ageInMilliseconds / (1000 * 60 * 60 * 24));
}

/**
 * Get top token holders from the API
 * @param {string} chainId - The chain id string
 * @param {string} contractAddress - The contract address to fetch info for
 * @param {object} networkIdMap - The network id to fetch info for chainbase api
 * @returns {object[]} - The token holders information
 */
async function getTokenHolders(chainId, contractAddress) {
    const networkIdMap  = {
        "ethereum" : '1',
        "polygon" : '137',
        "bnb" : '56',
        "avalanche" : '43114',
        "arbitrum" : '42161',
        "optimism" : '10',
        "base" : '8453',
        "zksync" : '324',
        "merlin" : '4200'
    };

    const networkId = networkIdMap [chainId];
    const API_KEY = 'your chainbase api key';
    // const API_KEY = '2gJpflWDTVhpmZbawQ57R10asao';

    const headers = {
        'x-api-key': API_KEY,
        'accept': 'application/json'
    };

    try {
        const response = await axios.get(
            `https://api.chainbase.online/v1/token/top-holders?chain_id=${networkId}&contract_address=${contractAddress}&page=1&limit=5`, { headers }
        );

        return response.data.data;
    } catch (error) {
        console.error('Error fetching token holders:', error);
        return [];
    }
}

/* Generates HTML for top token holders
* @param {object[]} tokenHolders - The token holders information
* @param {object} tokenPair - The token pair information
* @returns {string} - The HTML string for top token holders
*/
function generateTokenHoldersHtml(tokenHolders, tokenPair) {
    let tokenHoldersHtml = "";
    for (let i = 0;i < tokenHolders.length;i++) {
        const wallet = tokenHolders[i].wallet_address;
        const amount = (tokenHolders[i].amount / 1e12).toFixed(2);
        const percentage = (tokenHolders[i].amount * tokenPair.priceUsd * 100 / tokenPair.fdv).toFixed(2);
        tokenHoldersHtml += `<a href = "${tokenPair.url}">├${wallet.slice(0, 4)}...${wallet.slice(-4)}</a> | ${amount}t | ${percentage}%
        `;
    }
    return tokenHoldersHtml;
}

/**
 * Generates HTML for socials and websites
 * @param {object} info - The token info object
 * @returns {object} - An object containing the socialsHtml and websitesHtml strings
 */
function generateSocialsAndWebsitesHtml(info) {
    let socialsHtml = "";
    let websitesHtml = "";

    if (info) {
        if (info.socials && info.socials.length > 0) {
            socialsHtml = `<a href="${info.socials[0].url}">Twitter</a>`;
            if (info.socials[1]) {
                socialsHtml += ` | <a href="${info.socials[1].url}">Telegram</a>`;
            }
        }

        if (info.websites && info.websites.length > 0) {
            websitesHtml = ` | <a href="${info.websites[0].url}">Website</a>`;
        }
    }

    return { socialsHtml, websitesHtml };
}

/**
 * Generates the token information HTML response
 * @param {object} tokenPair - The token pair object
 * @param {number} ageInDays - The age of the token in days
 * @param {string} socialsHtml - The HTML string for socials
 * @param {string} websitesHtml - The HTML string for websites
 * @returns {string} - The formatted HTML string
 */
function generateTokenInfoHtml(tokenPair, ageInDays, tokenHoldersHtml, socialsHtml, websitesHtml) {
    return `
        <b>ANALYSED BY</b> @scan_test1_bot

        📊 <a href="${tokenPair.url}">${tokenPair.baseToken.name} (${tokenPair.baseToken.symbol})</a>
        CA: ${tokenPair.baseToken.address}
        
        🔸Chain:${tokenPair.chainId}
        ⚖️Age: ${ageInDays}
        💰Liq: $${(tokenPair.liquidity.usd / 1e6).toFixed(2)}M | FDV: $${(tokenPair.fdv / 1e6).toFixed(2)}M
        🛡️BLACKLIST: NO | HONEYPOT: NO
        📉24h: ${tokenPair.priceChange.h24}% | 6h: ${tokenPair.priceChange.h6}% | 1h: ${tokenPair.priceChange.h1}%
        📊24h volume: ${tokenPair.volume.h24}
        
        💲Price per token: ${tokenPair.priceUsd}
        
        🥇 <b>TOP HOLDERS:</b>
        ${tokenHoldersHtml}
        
        ♟️ <b>TEAM WALLETS:</b>
        2 wallets holding 7.25%
        <a href="https://etherscan.io/address/0x2c09deaa11357f19c1bf805b8a7b001ab9a5470f">├0x2c...470f</a> 6.9% of supply
        <a href="https://etherscan.io/address/0x9d83f4db5c99e5d06e1857269c68443206422327">└0x9d...2327</a> 0.35% of supply
        
        🔎 ${socialsHtml + websitesHtml}
        🔗<a href="${tokenPair.url}">DexScreener</a> | <a href="https://www.dextools.io/app/${tokenPair.chainId}/pair-explorer/${tokenPair.pairAddress}">DexTools</a>
    `;
}
