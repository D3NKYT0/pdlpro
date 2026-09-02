import "./programs.css";
import { PageHeader } from '../ui/PageHeader';

type ProgramHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function ProgramHeader({ eyebrow, title, description }: ProgramHeaderProps) {
  return (
    <PageHeader className="program-hero program-hero--editorial" eyebrow={eyebrow} title={title} description={description} descriptionClassName="" />
  );
}
