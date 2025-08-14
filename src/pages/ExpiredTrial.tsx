
export default function ExpiredTrial() {
  const href = `https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER}?text=${encodeURIComponent('Halo, masa trial Zyngra POS saya sudah habis. Mohon info perpanjangan/aktivasi. Terima kasih!')}`
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="p-6 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 max-w-md text-center">
        <div className="text-2xl font-bold mb-2">Masa Trial Habis</div>
        <p className="opacity-80">Masa trial 3 hari Anda telah berakhir. Silakan menghubungi kami untuk aktivasi.</p>
        <a href={href} target="_blank" className="inline-block mt-4 px-4 py-2 rounded-lg bg-green-600 text-white">Hubungi via WhatsApp</a>
      </div>
    </div>
  )
}
