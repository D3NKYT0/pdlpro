import "./programs.css";

type ProgramHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function ProgramHeader({ eyebrow, title, description }: ProgramHeaderProps) {
  return (
    <header className="card program-hero program-hero--editorial">
      <div>
        <span className="panel-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </header>
  );
}
