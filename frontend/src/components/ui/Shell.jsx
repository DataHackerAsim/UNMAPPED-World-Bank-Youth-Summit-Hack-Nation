export default function Shell({ children, className = '' }) {
  return (
    <main className={`w-full max-w-6xl mx-auto p-6 md:p-8 animate-fade-in ${className}`}>
      {children}
    </main>
  )
}