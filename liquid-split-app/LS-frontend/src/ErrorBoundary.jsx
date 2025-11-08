import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // store stack info as well
    this.setState({ info });
    // eslint-disable-next-line no-console
    console.error('Uncaught error in component tree:', error, info);
  }

  render() {
    const { error, info } = this.state;
    if (error) {
      return (
        <div style={{ padding: 24, fontFamily: 'system-ui,Segoe UI,Roboto,Helvetica,Arial' }}>
          <h2 style={{ color: '#b91c1c' }}>Application error</h2>
          <p style={{ color: '#111' }}>{String(error && error.message ? error.message : error)}</p>
          {info && info.componentStack && (
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{info.componentStack}</pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
