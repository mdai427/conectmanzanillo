import { Component } from 'react'
import ErrorPage from '../../pages/ErrorPage.jsx'

export default class AppErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false } }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error, info) { console.error('[Faro Portuario]', error, info.componentStack) }
  render() { return this.state.hasError ? <ErrorPage status={500} /> : this.props.children }
}
