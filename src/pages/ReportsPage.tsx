import { AppLayout } from "@/components/AppLayout";
import { Reports } from "@/components/Reports";
import { useLoadriteData } from "@/hooks/useLoadriteData";
import { useTicketTemplate } from "@/hooks/useTicketTemplate";
import { useEffect } from "react";

const ReportsPage = () => {
  const { tickets, loadFromDb } = useLoadriteData();
  const { reportFields, reportEmailConfig } = useTicketTemplate();

  useEffect(() => { loadFromDb(); }, [loadFromDb]);

  return (
    <AppLayout title="Reports">
      <div className="container mx-auto px-4 py-6 sm:px-6">
        <Reports tickets={tickets} reportFields={reportFields} reportEmailConfig={reportEmailConfig} />
      </div>
    </AppLayout>
  );
};

export default ReportsPage;
