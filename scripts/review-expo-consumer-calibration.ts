import {runCalibrationCommand} from './expo-consumer-calibration'

if(import.meta.main){const result=await runCalibrationCommand(process.argv.slice(2));if(result.exitCode!==0)process.exitCode=result.exitCode}
