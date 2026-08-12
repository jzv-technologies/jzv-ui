import React from 'react';

class ModalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Modal Error Boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-dark-almostblack/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-red-200 shadow-2xl max-w-lg w-full p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-xl">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h3 className="text-base font-black text-dark-primary">Modal Component Error</h3>
            <p className="text-xs text-dark-muted font-bold">
              An unexpected error occurred while displaying this modal:
            </p>
            <div className="p-3 bg-red-50 text-red-800 text-[11px] font-mono rounded-xl border border-red-200 text-left overflow-x-auto max-h-32">
              {this.state.error?.toString()}
            </div>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (this.props.onClose) this.props.onClose();
              }}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all"
            >
              Close & Reset Modal
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ModalErrorBoundary;
