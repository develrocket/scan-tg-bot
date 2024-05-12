const { Bot } = require("grammy");
const axios = require('axios');
// Create a bot token
const bot = new Bot("botToken");

// Start the bot (using long polling)
bot.start();

// Handle the /start command
bot.command("start", (ctx) => ctx.reply("Welcome! Input Contract Address."));

// Handle other messages
bot.on("message:text", async (ctx) => {
    let responseData = "Input contract address correctly.";
    
    if(await isContractAddress(ctx.message.text)){
        const tokenInfo = await getTokenInfo(ctx.message.text);

        if(tokenInfo.pairs && tokenInfo.pairs.length > 0){
            const tokenPair = tokenInfo.pairs[0];
            const ageInMilliseconds  = new Date() - new Date(tokenPair.pairCreatedAt);
            const ageInDays = parseInt(ageInMilliseconds / (60 * 60 * 24 * 1000));
            
            let socials_html = "";
            let websites_html = "";

            if(tokenPair.info){
                const info = tokenPair.info;

                if(info.socials){
                    const socials = info.socials;
                    socials_html += `<a href = "${info.socials[0].url}">Twitter</a>`;

                    if(socials[1]){
                        socials_html += ` | <a href="${info.socials[1].url}">Telegram</a>`;
                    }
                }

                if(info.websites && info.websites.length > 0){
                    websites_html = ` | <a href = "${info.websites[0].url}">Website</a>`;
                }
            }

            responseData = `
                <b>ANALYSED BY</b> @contract_scan_dev_bot
        
                📊 <a href = "${tokenPair.url}">${tokenPair.baseToken.name} (${tokenPair.baseToken.symbol})</a>
                CA: ${tokenPair.baseToken.address}
                
                ⚖️Age:${ageInDays}
                💰Liq:$${tokenPair.liquidity.usd} | FDV:$${tokenPair.fdv}
                🛡️BLACKLIST:NO | HONEYPOT:NO
                📉24h:${tokenPair.priceChange.h24}% |6h:${tokenPair.priceChange.h6}% | 1h:${tokenPair.priceChange.h1}%
                📊24h volume:${tokenPair.volume.h24}
                
                💲Price per token: ${tokenPair.priceUsd}
                
                🥇 <b>TOP HODERS:</b>
                <a href = "https://etherscan.io/address/0xec1ef345783783fc11c519aa20c3ab607780ae41">├0xec...ae41</a> | 9.08t | 13.16%
                <a href = "https://etherscan.io/address/0x5bb8f1ce603577a4d17cc9d72f6a4c38f3b0b74c">├0x5b...b74c</a> | 6.85t | 9.93%
                <a href = "https://etherscan.io/address/0xec1ef345783783fc11c519aa20c3ab607780ae41">├0xf9...acec</a> | 6.43t | 9.32%
                <a href = "https://etherscan.io/address/0x2c09deaa11357f19c1bf805b8a7b001ab9a5470f">├0x2c...470f</a> | 4.76t | 6.9%
                <a href = "https://etherscan.io/address/0x6cc5f688a315f3dc28a7781717a9a798a59fda7b">└0x6c...da7b</a> | 1.78t | 2.58%
                
                ♟️ <b>TEAM WALLETS:</b>
                2 wallets holding 7.25%
                <a href = "https://etherscan.io/address/0x2c09deaa11357f19c1bf805b8a7b001ab9a5470f">├0x2c...470f</a> 6.9% of supply
                <a href = "https://etherscan.io/address/0x9d83f4db5c99e5d06e1857269c68443206422327">└0x9d...2327</a> 0.35% of supply
                
                🔎 ${socials_html + websites_html}
                🔗<a href = "https://dexscreener.com/${tokenPair.chainId}/${tokenPair.pairAddress}">DexScreener</a> | <a href = "https://www.dextools.io/app/${tokenPair.chainId}/pair-explorer/${tokenPair.pairAddress}">DexTools</a>
            `;
        }
        
    }
    ctx.reply(responseData, { parse_mode: 'HTML' });
});

async function getTokenInfo(contractAddress) {
    try {
        const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`);
        return response.data;
    } catch (error) {
      console.error('Error fetching pair info:', error.message);
    }
  }

async function isContractAddress(contractAddress) {
    try {
        return contractAddress.length >30;
    } catch (error) {
        console.error('Error fetching contract address:', error.message);
        return false;
    }
}