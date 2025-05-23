const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const app = express();
const upload = multer({ dest: 'uploads/' });

const openai = new OpenAI({
  apiKey: 'yours',
});

const SYSTEM_PROMPT = {
  role: 'system',
  content: `You are an AI Assistant for students of all school levels.

Guide students step-by-step without giving direct answers. Start with a general hint to approach the problem. If they need more help, offer progressively detailed steps.
Only if the student is truly stuck, provide the full solution but ensure they understand the process.
Your goal is to instill confidence, critical thinking, and problem-solving skills in students.
Don't give direct answers, just step-by-step key hints. If people don't understand, give another key hint for approach. Just hints, no full solution. 1–2 hints. Also give full theory for their solving. If the language is not mentioned, then Russian is automatically used.
Never give a complete solution or complete code, just hints.`
};

let history = [SYSTEM_PROMPT];

app.use(express.json());
app.use(express.static('public'));

app.post('/api/assistant', async (req, res) => {
  const message = req.body.message;
  history.push({ role: 'user', content: message });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: history,
    });

    const reply = completion.choices[0].message.content;
    history.push({ role: 'assistant', content: reply });

    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка OpenAI: ' + err.message });
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  const filePath = req.file.path;

  try {
    const result = await Tesseract.recognize(filePath, 'rus+eng+kaz');
    fs.unlinkSync(filePath);

    const text = result.data.text.trim();

    history.push({ role: 'user', content: `Изображение содержало следующий текст:\n${text}` });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: history,
    });

    const reply = completion.choices[0].message.content;
    history.push({ role: 'assistant', content: reply });

    res.json({ extractedText: text, reply });

  } catch (err) {
    res.status(500).json({ error: 'Ошибка OCR: ' + err.message });
  }
});

app.listen(3000, () => console.log('http://localhost:3000'));
