export default function Catalogo() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-navy text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="font-bold text-lg">Tienda Maxan</span>
          <span className="text-sm text-white/70">Maxan Sistemas</span>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-navy">La tienda de Maxan Sistemas</h1>
        <p className="mt-4 text-gray-500 max-w-xl mx-auto">
          Próximamente podrás cotizar equipos, licencias y servicios directamente desde aquí.
        </p>
        <a
          href="https://maxansistemas.com"
          className="mt-8 inline-block bg-brand text-white px-6 py-3 rounded-lg font-semibold"
        >
          Conoce más en maxansistemas.com
        </a>
      </main>
    </div>
  )
}
