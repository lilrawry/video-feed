import MusicPlayer from './MusicPlayer';

export default function Intro() {
  return (
    <article className="intro-slide" aria-label="Introduction">
      <div className="intro-inner">
        <div className="intro-message">
          <p className="intro-line">hiii,</p>
          <p className="intro-name">Tiger here</p>
          <p className="intro-line">these are my fav videos edits.</p>
          <p className="intro-scroll">
            scroll to start the adventure
            <b>&#8595;</b>
          </p>
        </div>
        <div className="intro-preview">
          <MusicPlayer />
        </div>
      </div>
    </article>
  );
}
