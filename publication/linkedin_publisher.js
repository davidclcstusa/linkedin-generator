require('dotenv').config();
const axios = require('axios');

const API_URL = 'https://api.linkedin.com/v2';

async function getAuthorUrn(token) {
    if (process.env.LINKEDIN_PERSON_URN) return process.env.LINKEDIN_PERSON_URN;
    const res = await axios.get(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return `urn:li:person:${res.data.id}`;
}

async function publicarEnLinkedIn(texto) {
    const token = process.env.LINKEDIN_ACCESS_TOKEN;
    if (!token) throw new Error('Falta LINKEDIN_ACCESS_TOKEN en .env');

    const authorUrn = await getAuthorUrn(token);

    const body = {
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
            'com.linkedin.ugc.ShareContent': {
                shareCommentary: { text: texto },
                shareMediaCategory: 'NONE'
            }
        },
        visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
    };

    let res;
    try {
        res = await axios.post(`${API_URL}/ugcPosts`, body, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0'
            }
        });
    } catch (err) {
        const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
        throw new Error(`LinkedIn ${err.response?.status}: ${detail}`);
    }

    return res.data.id;
}

module.exports = { publicarEnLinkedIn };
