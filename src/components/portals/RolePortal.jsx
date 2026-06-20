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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-6">
              {tiles.map((tile) => (
                <button
                  key={tile.id}
                  onClick={tile.onClick}
                  className="group p-8 bg-white border border-light-border rounded-[2rem] hover:border-orange-primary hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer flex items-center gap-4 text-left w-full shadow-sm"
                >
                  <div
                    className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl shadow-xl ${tile.shadow || ''} transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shrink-0 ${tile.buttonColor || 'bg-orange-primary text-white'}`}
                  >
                    <i className={`fas ${tile.icon}`}></i>
                  </div>
                  <div>
                    <h5 className="font-bold sm:text-2xl text-lg text-dark-deepblue mb-2 group-hover:text-orange-primary transition-colors">
                      <Translate id={tile.titleKey}>{tile.title}</Translate>
                    </h5>
                    <p className="text-dark-muted text-base leading-relaxed line-clamp-2 sm:line-clamp-none">
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
