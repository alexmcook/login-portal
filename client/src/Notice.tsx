import { useState } from 'react'

export const Notice = ({ message, url }: { message: string; url: string }) => {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <dialog open>
      <article>
        <header>
          <button aria-label="Close" rel="prev" onClick={() => setVisible(false)} />
          <h3>Notice</h3>
        </header>
        <p>{message}</p>
        {url && <a href={url}>{url}</a>}
      </article>
    </dialog>
  );
};
