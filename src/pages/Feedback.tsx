import { AppLayout } from "@/components/AppLayout";
import { FeedbackForm } from "@/components/FeedbackForm";

const Feedback = () => {
  return (
    <AppLayout title="Feedback">
      <div className="container mx-auto px-4 py-6 sm:px-6">
        <FeedbackForm />
      </div>
    </AppLayout>
  );
};

export default Feedback;
