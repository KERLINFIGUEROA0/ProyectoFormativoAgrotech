import { useState, useEffect, type ReactElement } from 'react';
import { Input, Button, Select, SelectItem } from "@heroui/react";
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
                <Select
                    label="Protocolo *"
                    name="protocolo"
                    selectedKeys={[formData.protocolo || 'mqtt://']}
                    onSelectionChange={(keys) => {
                        const selected = Array.from(keys);
                        setFormData(prev => ({ ...prev, protocolo: String(selected[0]) || 'mqtt://' }));
                    }}
                    className="col-span-1"
                >
                    <SelectItem key="mqtt://">mqtt://</SelectItem>
                    <SelectItem key="mqtts://">mqtts://</SelectItem>
                    <SelectItem key="ws://">ws:// (WebSocket)</SelectItem>
                    <SelectItem key="wss://">wss:// (WebSocket Seguro)</SelectItem>
                </Select>
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