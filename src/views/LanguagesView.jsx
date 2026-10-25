const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ja", label: "Japanese Language" },
  { code: "my", label: "Myanmar Language" },
];

export default function LanguagesView({ language, onChange }) {
  return (
    <section className="view is-active">
      <div className="page-head">
        <div>
          <h2>Languages</h2>
          <p>Select the language for the app interface.</p>
        </div>
      </div>
      <div className="language-page-grid">
        {LANGUAGES.map(({ code, label }) => {
          const selected = language === code;
          return (
            <button
              key={code}
              className={"card language-page-choice" + (selected ? " is-selected" : "")}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(code)}
            >
              <span className="language-page-name">{label}</span>
              {selected ? <span className="language-page-status">Selected ✓</span> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
