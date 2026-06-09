import React from 'react';
import { motion } from 'motion/react';
import { Shield, User, ArrowRight, Building2, ClipboardCheck } from 'lucide-react';

interface RoleSelectionProps {
  onSelectRole: (role: 'owner' | 'employee') => void;
}

export default function RoleSelection({ onSelectRole }: RoleSelectionProps) {
  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#081b38] flex flex-col overflow-x-hidden relative">
      {/* Top Banner (Header) */}
      <header className="bg-[#002A5C] border-b border-[#c4c6d1] flex items-center w-full px-6 md:px-8 h-16 z-50 shadow-md">
        <div className="flex items-center gap-4">
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-wide">Venpro</h1>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow flex items-center justify-center p-6 md:p-8 z-10">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          
          {/* Welcome Column (Asymmetric Desktop Layout) */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col justify-center space-y-4 pr-0 md:pr-6"
          >
            <span className="text-xs font-bold text-[#00687b] uppercase tracking-widest">
              Bienvenido a Venpro
            </span>
            <h2 className="text-2xl md:text-4xl font-extrabold text-[#081b38] leading-tight">
              Selecciona tu perfil de acceso
            </h2>
            <p className="text-base md:text-lg text-[#43474f] leading-relaxed max-w-md">
              Gestión de inventarios inteligente para optimizar las operaciones de tu negocio con precisión quirúrgica.
            </p>
          </motion.div>

          {/* Roles Selection Column */}
          <div className="flex flex-col gap-6">
            
            {/* Role: Owner (Propietario) */}
            <motion.button
              whileHover={{ scale: 1.01, translateY: -2 }}
              whileTap={{ scale: 0.99 }}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              onClick={() => onSelectRole('owner')}
              className="group relative overflow-hidden bg-white border border-[#c4c6d1] p-6 rounded-xl flex flex-col items-start text-left transition-all hover:shadow-xl hover:border-[#50dcff] duration-300"
            >
              {/* Background watermark */}
              <div className="absolute top-2 right-2 p-4 text-[#c4c6d1] opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                <Building2 size={88} strokeWidth={1} />
              </div>

              {/* Blue icon container */}
              <div className="w-12 h-12 rounded-full bg-[#50dcff] flex items-center justify-center mb-4 text-[#001f27] shadow-inner">
                <Shield size={24} className="stroke-[2.5]" />
              </div>

              <h3 className="text-xl font-bold text-[#081b38] mb-1">
                Soy propietario
              </h3>
              <p className="text-sm text-[#43474f] leading-relaxed max-w-[85%]">
                Acceso total a reportes, finanzas, configuración y gestión global.
              </p>

              <div className="mt-5 flex items-center gap-2 text-[#00687b] font-semibold text-sm group-hover:translate-x-2 transition-transform">
                <span>Ingresar</span>
                <ArrowRight size={16} />
              </div>
            </motion.button>
            
            {/* Role: Employee (Empleado) */}
            <motion.button
              whileHover={{ scale: 1.01, translateY: -2 }}
              whileTap={{ scale: 0.99 }}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              onClick={() => onSelectRole('employee')}
              className="group relative overflow-hidden bg-white border border-[#c4c6d1] p-6 rounded-xl flex flex-col items-start text-left transition-all hover:shadow-xl hover:border-[#50dcff] duration-300"
            >
              {/* Background watermark */}
              <div className="absolute top-2 right-2 p-4 text-[#c4c6d1] opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                <ClipboardCheck size={88} strokeWidth={1} />
              </div>

              {/* Lavender icon container */}
              <div className="w-12 h-12 rounded-full bg-[#e0e8ff] flex items-center justify-center mb-4 text-[#00687b] shadow-inner">
                <User size={24} className="stroke-[2.5]" />
              </div>

              <h3 className="text-xl font-bold text-[#081b38] mb-1">
                Soy empleado
              </h3>
              <p className="text-sm text-[#43474f] leading-relaxed max-w-[85%]">
                Operaciones de stock, escaneo de productos y control de salidas.
              </p>

              <div className="mt-5 flex items-center gap-2 text-[#00687b] font-semibold text-sm group-hover:translate-x-2 transition-transform">
                <span>Ingresar</span>
                <ArrowRight size={16} />
              </div>
            </motion.button>

          </div>
        </div>
      </main>

      {/* Background Decorative Elements */}
      <div className="fixed inset-0 -z-10 pointer-events-none opacity-40">
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-[#50dcff] blur-[120px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[300px] h-[300px] rounded-full bg-[#e0e8ff] blur-[100px]" />
      </div>
    </div>
  );
}
