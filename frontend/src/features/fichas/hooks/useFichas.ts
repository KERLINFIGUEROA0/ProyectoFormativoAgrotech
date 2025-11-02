import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { Ficha, FichaOption } from '../interfaces/fichas';
import { getFichas, getFichasOpciones, createFicha, updateFicha, deleteFicha } from '../api/fichas';

export const useFichas = () => {
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [loading, setLoading] = useState(false);
  const [opciones, setOpciones] = useState<FichaOption[]>([]);

  const loadFichas = async () => {
    try {
      setLoading(true);
      const data = await getFichas();
      setFichas(data);
    } catch (error) {
      toast.error('Error al cargar las fichas');
      console.error('Error loading fichas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOpciones = async () => {
    try {
      const data = await getFichasOpciones();
      setOpciones(data);
    } catch (error) {
      console.error('Error loading ficha options:', error);
    }
  };

  const create = async (fichaData: { nombre: string; id_ficha: string }) => {
    try {
      await createFicha(fichaData);
      toast.success('Ficha creada exitosamente');
      loadFichas();
      loadOpciones();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al crear la ficha');
      throw error;
    }
  };

  const update = async (id: number, fichaData: { nombre?: string; id_ficha?: string }) => {
    try {
      await updateFicha(id, fichaData);
      toast.success('Ficha actualizada exitosamente');
      loadFichas();
      loadOpciones();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al actualizar la ficha');
      throw error;
    }
  };

  const remove = async (id: number) => {
    try {
      await deleteFicha(id);
      toast.success('Ficha eliminada exitosamente');
      loadFichas();
      loadOpciones();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar la ficha');
      throw error;
    }
  };

  useEffect(() => {
    loadFichas();
    loadOpciones();
  }, []);

  return {
    fichas,
    opciones,
    loading,
    loadFichas,
    loadOpciones,
    create,
    update,
    remove,
  };
};