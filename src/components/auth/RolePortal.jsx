import React from 'react';
import { useNavigate } from 'react-router-dom';
import Translate from '../Translate';
import PortalLayout from '../layout/PortalLayout';

const RolePortal = ({ userRoles, role, tiles = [], children, subView, onSetSubView }) => {
  const navigate = useNavigate();
  const isFullWidth = role === 'management' && !!subView;

  return (
    <PortalLayout
      userRoles={userRoles}
      roleName={role}
      subView={subView}
      onSetSubView={onSetSubView}
    >
      <div className="w-full">
        <div className={isFullWidth ? 'w-full max-w-none' : 'max-w-full mx-2'}>
          {/* Legacy Portal Notice with Switcher to v2 */}
          <div className="mb-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs text-xs">
            <div className="flex items-center gap-2 text-amber-900">
              <i className="fas fa-info-circle text-amber-500 text-sm shrink-0"></i>
              <span>
                Viewing <strong>legacy {role} portal</strong>. Dynamic features configured via <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-purple-700">app_view_controller</code> are active in the <strong>Unified Portal</strong>.
              </span>
            </div>
            <button
              onClick={() => navigate('/portal/v2')}
              className="px-3 py-1.5 rounded-xl bg-orange-primary hover:bg-orange-dark text-white font-bold transition-all shrink-0 flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>Switch to Unified Portal (v2)</span>
              <i className="fas fa-arrow-right text-[10px]"></i>
            </button>
          </div>

          {/* Status Messages / SubView Content / Children */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
            {children}
          </div>

          {/* Main Tiles - Only visible if no subView is active */}
          {!subView && tiles.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-4 sm:mt-6">
              {tiles.map((tile) => {
                const topBarClass =
                  (tile.buttonColor &&
                    tile.buttonColor.split(' ').find((c) => c.startsWith('bg-'))) ||
                  (tile.color ? `bg-${tile.color}` : 'bg-orange-primary');

                const hoverBorderClass = topBarClass
                  ? topBarClass.replace('bg-', 'hover:border-')
                  : 'hover:border-orange-primary';

                return (
                  <button
                    key={tile.id}
                    onClick={tile.onClick}
                    className={`group pt-5 pb-3.5 px-3.5 sm:pt-7 sm:pb-5 sm:px-5 lg:pt-8 lg:pb-6 lg:px-6 bg-white border border-light-border rounded-2xl sm:rounded-[1.75rem] ${hoverBorderClass} hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer flex flex-col sm:flex-row items-center sm:items-center gap-2.5 sm:gap-3.5 text-center sm:text-left w-full shadow-sm relative overflow-hidden`}
                  >
                    <div className={`absolute top-0 left-0 right-0 h-1.5 sm:h-2 ${topBarClass}`} />
                    <div
                      className={`w-10 h-10 sm:w-14 lg:w-16 sm:h-14 lg:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-xl lg:text-2xl shadow-md sm:shadow-lg ${tile.shadow || ''} transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shrink-0 ${tile.buttonColor || 'bg-orange-primary text-white'}`}
                    >
                      <i className={`fas ${tile.icon}`}></i>
                    </div>
                    <div className="w-full">
                      <h5 className="font-bold text-xs sm:text-base lg:text-xl text-dark-deepblue sm:mb-1.5 group-hover:text-orange-primary transition-colors leading-tight">
                        <Translate id={tile.titleKey}>{tile.title}</Translate>
                      </h5>
                      <p className="hidden sm:block text-dark-muted text-xs lg:text-sm leading-relaxed">
                        <Translate id={tile.descriptionKey}>{tile.description}</Translate>
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
};

export default RolePortal;
