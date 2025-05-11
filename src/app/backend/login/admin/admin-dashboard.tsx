/* pages/admin-dashboard.tsx
import { useRouter } from "next/router";

const AdminDashboard: React.FC = () => {
  const router = useRouter();
  const { id } = router.query; // This is where you will get the admin ID passed from the login page

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-4xl mx-auto">
        <h1 className="text-3xl font-semibold text-center text-gray-800 mb-6">
          Admin Dashboard
        </h1>
        <p className="text-xl text-gray-700">
          Welcome, Admin ID: <strong>{id}</strong>
        </p>
        <div className="mt-8">
          <p className="text-lg text-gray-800">
            Here you can manage students, view data, and configure settings.
          </p>
          {/* Add buttons, links, or sections here for other admin tasks }
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 
 
*/
