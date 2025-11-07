import { useState, useEffect, type ReactElement } from 'react';
import { Input, Button } from "@heroui/react";
import { toast } from "sonner";
import type { CreateBrokerDto } from '../interfaces/iot';

interface BrokerFormProps {
    initialData?: Partial<CreateBrokerDto>;
    onSave: (data: CreateBrokerDto) => void;
    onCancel: () => void;
}

export default function BrokerForm({ initialData = {}, onSave, onCancel }: BrokerFormProps): ReactElement {
    const [formData, setFormData] = useState<Partial<CreateBrokerDto>>({
        protocolo: 'mqtt://',
        puerto: 1883,
        ...initialData,
    });

    useEffect(() => {
        setFormData({
            protocolo: 'mqtt://',
            puerto: 1883,
            ...initialData,
        });
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        const { nombre, host, puerto, protocolo } = formData;
        if (!nombre || !host || !puerto || !protocolo) {
            toast.error("Nombre, Protocolo, Host y Puerto son requeridos.");
            return;
        }

        onSave({
            ...formData,
            puerto: Number(puerto),
        } as CreateBrokerDto);
    };

    return (
        <div className="flex flex-col gap-4 p-4">
            <Input
                label="Nombre Descriptivo *"
                name="nombre"
                value={formData.nombre || ''}
                onChange={handleChange}
                placeholder="Ej: Broker Local, Mosquitto Público"
                fullWidth
            />
            <div className="grid grid-cols-3 gap-4">
                <label className="flex flex-col gap-1 col-span-1">
                    <span className="text-sm font-medium text-gray-700">Protocolo *</span>
                    <select
                        name="protocolo"
                        value={formData.protocolo || 'mqtt://'}
                        onChange={handleChange}
                        className="border border-gray-300 rounded-md p-2 bg-white"
                    >
                        <option value="mqtt://">mqtt://</option>
                        <option value="mqtts://">mqtts://</option>
                        <option value="ws://">ws:// (WebSocket)</option>
                        <option value="wss://">wss:// (WebSocket Seguro)</option>
                    </select>
                </label>
                <Input
                    label="Host (Dirección) *"
                    name="host"
                    value={formData.host || ''}
                    onChange={handleChange}
                    placeholder="Ej: test.mosquitto.org"
                    className="col-span-2"
                    fullWidth
                />
            </div>
            <Input
                label="Puerto *"
                name="puerto"
                type="number"
                value={String(formData.puerto || '')}
                onChange={handleChange}
                placeholder="Ej: 1883"
                fullWidth
            />
            <div className="grid grid-cols-2 gap-4">
                <Input
                    label="Usuario (Opcional)"
                    name="usuario"
                    value={formData.usuario || ''}
                    onChange={handleChange}
                    placeholder="Usuario de conexión"
                    fullWidth
                />
                <Input
                    label="Contraseña (Opcional)"
                    name="password"
                    type="password"
                    value={formData.password || ''}
                    onChange={handleChange}
                    placeholder="••••••••"
                    fullWidth
                />
            </div>

            <div className="flex justify-end gap-3 mt-4">
                <Button onClick={onCancel} color="danger" variant="light">Cancelar</Button>
                <Button onClick={handleSubmit} color="success">Guardar Broker</Button>
            </div>
        </div>
    );
}