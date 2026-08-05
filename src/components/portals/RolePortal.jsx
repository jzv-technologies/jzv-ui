import React from 'react';
import Translate from '../Translate';
import PortalLayout from '../layout/PortalLayout';

const RolePortal = ({ userRoles, role, tiles = [], children, subView, onSetSubView }) => {
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
          {/* Status Messages / SubView Content / Children */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
            {children}
          </div>

          {/* Main Tiles - Only visible if no subView is active */}
          {!subView && tiles.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-2 gap-3 sm:gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-4 sm:mt-6">
              {tiles.map((tile) => (
                <button
                  key={tile.id}
                  onClick={tile.onClick}
                  className="group p-3.5 sm:p-6 md:p-8 bg-white border border-light-border rounded-2xl sm:rounded-[2rem] hover:border-orange-primary hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer flex flex-col sm:flex-row items-center sm:items-center gap-2.5 sm:gap-4 text-center sm:text-left w-full shadow-sm"
                >
                  <div
                    className={`w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl md:text-3xl shadow-lg sm:shadow-xl ${tile.shadow || ''} transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shrink-0 ${tile.buttonColor || 'bg-orange-primary text-white'}`}
                  >
                    <i className={`fas ${tile.icon}`}></i>
                  </div>
                  <div className="w-full">
                    <h5 className="font-bold text-xs sm:text-lg md:text-2xl text-dark-deepblue sm:mb-2 group-hover:text-orange-primary transition-colors leading-tight">
                      <Translate id={tile.titleKey}>{tile.title}</Translate>
                    </h5>
                    <p className="hidden sm:block text-dark-muted text-sm md:text-base leading-relaxed">
                      <Translate id={tile.descriptionKey}>{tile.description}</Translate>
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
};

export default RolePortal;
