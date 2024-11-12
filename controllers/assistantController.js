// controllers/assistantController.js
const axios = require('axios');
const User = require('../models/User');

exports.processAssistantRequest = async (req, res) => {
  const { query, url } = req.body;
  const user = req.user;

  // Implement usage limits based on subscription
  if (user.subscription === 'free' && user.usageCount >= process.env.FREE_LIMIT) {
    return res.status(402).json({ message: 'Usage limit reached. Please upgrade your plan.' });
  }

  try {
    const prompt = `User is on ${url}. They have selected the following text: "${query}". Provide assistance based on this context.`;
    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );

    const assistantResponse = openaiResponse.data.choices[0].message.content;

    // Update user usage
    user.usageCount = (user.usageCount || 0) + 1;
    await user.save();

    res.json({ response: assistantResponse });
  } catch (error) {
    res.status(500).json({ message: 'Error processing request' });
  }
};