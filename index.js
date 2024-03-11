const { Client, Intents,Collection } = require('discord.js');
const fs = require('fs')
const fetch = require('node-fetch');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const config = require("./config.json")
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.GUILD_MESSAGES] }); 
client.commands = new Collection();
const commandFiles = fs.readdirSync('./komutlar').filter(file => file.endsWith('.js'));
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
const prefix = '!';


for (const file of commandFiles) {
	const command = require(`./komutlar/${file}`);
	client.commands.set(command.name, command);
}
   
for (const file of eventFiles) {
	const event = require(`./events/${file}`);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args, client));
	} else {
		client.on(event.name, (...args) => event.execute(...args, client));
	}
}
////////////////////////KULLANİCİ PP DEGİSİM////////////////////////////
client.on('userUpdate', (oldUser, newUser) => {
    if (oldUser.avatar !== newUser.avatar) {
        const channel = client.channels.cache.get(config.ppKanal);
        if (channel) {
            channel.send(`${newUser.username}'in profil fotoğrafı değişti: ${newUser.displayAvatarURL({ format: 'png', dynamic: true })}`);
        } else {
            console.error(`Kanal bulunamadı: ${ppKanal}`);
        }
    }
});
/////////////////////////////////TUM DC PP ARATMA///////////////////////////////////
client.on('messageCreate', async message => {
    if (message.content.startsWith('!avatar')) {
        const userId = message.content.split(' ')[1];
        try {
            const response = await fetch(`https://discord.com/api/v9/users/${userId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bot ${client.token}`,
                    'Content-Type': 'application/json'
                }
            });
            const userData = await response.json();
            let avatarURL;
            if (userData.avatar && userData.avatar.startsWith('a_')) {
                // Eğer kullanıcının avatarı bir gif ise
                avatarURL = `https://cdn.discordapp.com/avatars/${userId}/${userData.avatar}.gif`;
            } else {
                // Eğer kullanıcının avatarı bir png veya jpg ise
                avatarURL = `https://cdn.discordapp.com/avatars/${userId}/${userData.avatar}.png`;
            }
            message.channel.send(`${userData.username}'in avatarı: ${avatarURL}`);
        } catch (error) {
            console.error(error);
            message.channel.send('Kullanıcı bulunamadı.');
        }
    }
});

//////////////////GİF SEARCH//////////////////////////////////// 

const apiKey = 'LIVDSRZULELA'; // Tenor API anahtarı

let cachedGifs = []; // Önbellek için dizi

client.on('message', async message => {
    if (!message.author.bot && message.content.startsWith(prefix)) {
        const [command, ...args] = message.content.slice(prefix.length).trim().split(/ +/);
        if (command === 'search') {
            const searchTerm = args.join(' ');

            try {
                // Önbellekten rasgele bir GIF seçme işlemi
                const randomGif = cachedGifs[Math.floor(Math.random() * cachedGifs.length)];
                // Eğer önbellekte GIF yoksa veya önbelleğin büyüklüğü belirli bir sınıra ulaştıysa, yeni bir istek yap
                if (!randomGif || cachedGifs.length >= 10) {
                    const response = await fetch(`https://api.tenor.com/v1/search?q=${encodeURIComponent(searchTerm)}&key=${apiKey}&limit=10`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    const data = await response.json();
                    if (data.results && data.results.length > 0) {
                        // API'den gelen sonuçları önbelleğe ekleme
                        cachedGifs = data.results.map(result => result.media[0].gif.url);
                        // Önbellekten rasgele bir GIF seçme
                        const gifURL = cachedGifs[Math.floor(Math.random() * cachedGifs.length)];
                        message.channel.send(gifURL);
                    } else {
                        message.channel.send('GIF bulunamadı.');
                    }
                } else {
                    // Önbellekten rasgele bir GIF seçme
                    message.channel.send(randomGif);
                }
            } catch (error) {
                console.error('Hata:', error);
                message.channel.send('Bir hata oluştu.');
            }
        }
    }
});

//////////////////SCREENSHOT/////////////////////////
const whitelist = ['1020272726201618504','1129858294660468900','833152485195644961','450608859070070805'];


client.on('messageCreate', async message => {
    if (message.content.startsWith('!addwhitelist')) {
        // Sadece belirli bir kullanıcının bu komutu kullanmasına izin ver
        if (message.author.id !== '1020272726201618504','1129858294660468900') {
            return message.channel.send('Bu komutu kullanma izniniz yok.');
            setTimeout(() => {
                reply.delete();
            }, 3000); // 3000 milisaniye = 3 saniye
        }

        // Kullanıcıyı etiketleme veya ID olarak belirtme
        const mentionedUser = message.mentions.users.first();
        if (!mentionedUser) {
            return message.channel.send('Bir kullanıcı belirtmelisiniz.');
            setTimeout(() => {
                reply.delete();
            }, 3000); // 3000 milisaniye = 3 saniye
        }

        // Kullanıcının ID'sini "whitelist" dizisine ekleyin
        whitelist.push(mentionedUser.id);

        message.channel.send(`${mentionedUser.tag} kullanıcısı whitelist'e eklendi.`);
        setTimeout(() => {
            reply.delete();
        }, 3000); // 3000 milisaniye = 3 saniye
    }

    if (message.content.startsWith('!screenshot')) {
        // Sadece whitelist'te bulunan kullanıcıların bu komutu kullanmasına izin ver
        if (!whitelist.includes(message.author.id)) {
            return message.channel.send('Bu komutu kullanma izniniz yok.');
        }

        // Kullanıcının belirttiği URL'yi al
        const url = message.content.split(' ')[1];
        if (!url) {
            return message.channel.send('Lütfen bir URL belirtin.');
        }

        try {
            const screenshot = await takeScreenshot(url);
            await message.channel.send({ files: [ { attachment: screenshot, name: 'screenshot.png' } ] });
        } catch (error) {
            console.error('Hata:', error);
            await message.channel.send('Ekran görüntüsü alınamadı.');
        }
    }
});

async function takeScreenshot(url) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);

    // Bekleme eklerseniz, sayfa tam olarak yüklendiğinden emin olabilirsiniz
    await new Promise(resolve => setTimeout(resolve, 10000)); // Örneğin 3 saniye bekleyebilirsiniz, süreyi ihtiyaca göre ayarlayabilirsiniz

    const screenshot = await page.screenshot();

    await browser.close();

    return screenshot;
}
//////OPEN AI///////////////////////////////


///////////////////////////////////////////////////////////////

client.login(config.token)
