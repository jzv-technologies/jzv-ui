import Translate from "./Translate";

export const LoadingFallback = () => (
  <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center">
    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
    <p className="text-white font-medium">
      <Translate id="home.loading_session">Loading session...</Translate>
    </p>
  </div>
);
