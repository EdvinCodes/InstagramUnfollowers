import React, { ChangeEvent, FormEvent, useState } from 'react';
import { Timings } from '../model/timings';

interface SettingMenuProps {
  setSettingState: (state: boolean) => void;
  currentTimings: Timings;
  setTimings: (timings: Timings) => void;
}

// Sub-componente para evitar repetir código
interface SettingInputProps {
  label: string;
  value: number;
  min: number;
  name: string;
  onChange: (newValue: number) => void;
}

// Sub-componente corregido para alinear input a la derecha
const SettingRow = ({ label, value, min, name, onChange }: SettingInputProps) => (
  <div className='row'>
    <label htmlFor={name}>{label}</label>
    {/* Nuevo contenedor para agrupar Input + Unidad a la derecha */}
    <div className='input-group'>
      <input
        type='number'
        id={name}
        name={name}
        min={min}
        max={999999}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(Number(e.currentTarget.value))}
      />
      <span className='unit'>(ms)</span>
    </div>
  </div>
);

export const SettingMenu = ({ setSettingState, currentTimings, setTimings }: SettingMenuProps) => {
  const [timeBetweenSearchCycles, setTimeBetweenSearchCycles] = useState(
    currentTimings.timeBetweenSearchCycles,
  );
  const [timeToWaitAfterFiveSearchCycles, setTimeToWaitAfterFiveSearchCycles] = useState(
    currentTimings.timeToWaitAfterFiveSearchCycles,
  );
  const [timeBetweenUnfollows, setTimeBetweenUnfollows] = useState(
    currentTimings.timeBetweenUnfollows,
  );
  const [timeToWaitAfterFiveUnfollows, setTimeToWaitAfterFiveUnfollows] = useState(
    currentTimings.timeToWaitAfterFiveUnfollows,
  );

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    setTimings({
      timeBetweenSearchCycles,
      timeToWaitAfterFiveSearchCycles,
      timeBetweenUnfollows,
      timeToWaitAfterFiveUnfollows,
    });
    setSettingState(false);
  };

  return (
    <form onSubmit={handleSave}>
      <div className='backdrop'>
        <div className='setting-menu'>
          <div>
            <h3>Settings</h3>
          </div>

          <SettingRow
            label='Default time between search cycles'
            name='searchCycles'
            min={500}
            value={timeBetweenSearchCycles}
            onChange={setTimeBetweenSearchCycles}
          />

          <SettingRow
            label='Default time to wait after five search cycles'
            name='fiveSearchCycles'
            min={4000}
            value={timeToWaitAfterFiveSearchCycles}
            onChange={setTimeToWaitAfterFiveSearchCycles}
          />

          <SettingRow
            label='Default time between unfollows'
            name='timeBetweenUnfollow'
            min={1000}
            value={timeBetweenUnfollows}
            onChange={setTimeBetweenUnfollows}
          />

          <SettingRow
            label='Default time to wait after five unfollows'
            name='timeAfterFiveUnfollows'
            min={70000}
            value={timeToWaitAfterFiveUnfollows}
            onChange={setTimeToWaitAfterFiveUnfollows}
          />

          <div className='warning-container'>
            <h3 className='warning'>
              <b>WARNING:</b> Modifying these settings significantly increases the risk of your
              account being banned.
            </h3>
            <h3 className='warning'>USE AT YOUR OWN RISK.</h3>
          </div>

          <div className='btn-container'>
            <button className='btn' type='button' onClick={() => setSettingState(false)}>
              Cancel
            </button>
            <button className='btn btn-primary' type='submit'>
              Save
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};
