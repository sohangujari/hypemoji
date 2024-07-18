import React, { useState } from 'react';
import emojiData from './emojis.json';

const simpleHash = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

const textToEmoji = (text) => {
  const hash = Math.abs(simpleHash(text));
  const emojiSequence = [];
  const base = emojiData.emojis.length;

  let tempHash = hash;
  while (tempHash > 0) {
    const index = tempHash % base;
    emojiSequence.push(emojiData.emojis[index]);
    tempHash = Math.floor(tempHash / base);
  }

  while (emojiSequence.length < 4) {
    emojiSequence.push(emojiData.emojis[0]);
  }

  return emojiSequence.join(' ');
};

const HashToEmoji = () => {
  const [inputText, setInputText] = useState('');
  const [emojiSequence, setEmojiSequence] = useState('');

  const handleChange = (e) => {
    const text = e.target.value;
    setInputText(text);
    setEmojiSequence(textToEmoji(text));
  };

  return (
    <div className="text-center mt-12">
      <h1>Hash to Emoji Converter</h1>
      <input
        type="text"
        value={inputText}
        onChange={handleChange}
        placeholder="Enter text to convert"
        className="p-2 text-lg"
      />
      <div className="mt-5 text-2xl">
        {emojiSequence && (
          <>
            <strong>Emoji Sequence:</strong> {emojiSequence}
          </>
        )}
      </div>
    </div>
  );
};

const App = () => {
  return (
    <div>
      <HashToEmoji />
    </div>
  );
};

export default App;
