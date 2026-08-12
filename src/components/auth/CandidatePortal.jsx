import React from 'react';
import RolePortal from './RolePortal';
import DynamicForm from '../DynamicForm';

const CandidatePortal = ({ user, userRoles, subView, onSetSubView }) => {
  const candidateTiles = [
    {
      id: 'take-test',
      title: 'Take Test',
      description: 'Access and take your enabled evaluation tests.',
      icon: 'fa-vial',
      buttonColor: 'bg-teal-600 text-white',
      shadow: 'shadow-teal-200',
      onClick: () => onSetSubView('take-test'),
    },
  ];

  const renderTakeTestView = () => {
    return (
      <div className="bg-white border-0 shadow-none rounded-none animate-in fade-in slide-in-from-bottom-4 duration-500 w-full m-0 p-0 flex flex-col">
        <div className="p-8 sm:p-12 max-w-5xl mx-auto w-full">
          <DynamicForm uuid="online-teacher-test" textColor="text-teal-600" />
        </div>
      </div>
    );
  };

  return (
    <RolePortal
      userRoles={userRoles}
      role="candidate"
      tiles={candidateTiles}
      subView={subView}
      onSetSubView={onSetSubView}
    >
      {subView === 'take-test' ? renderTakeTestView() : null}
    </RolePortal>
  );
};

export default CandidatePortal;
