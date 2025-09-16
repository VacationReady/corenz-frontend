import HistoryButton from "./HistoryButton";

interface HeaderWithHistoryProps {
  title: string;
  employeeId: string;
  section: string;
  children?: React.ReactNode;
}

export default function HeaderWithHistory({
  title,
  employeeId,
  section,
  children,
}: HeaderWithHistoryProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {children}
      </div>
      <HistoryButton 
        employeeId={employeeId} 
        section={section}
        title={`${title} History`}
      />
    </div>
  );
}
