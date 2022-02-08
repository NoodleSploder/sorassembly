// Copyright 2019-2020 @Premiurly/polkassembly authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import styled from '@xstyled/styled-components';
import React from 'react';
import { Dropdown, DropdownItemProps, DropdownProps } from 'semantic-ui-react';
import bifrostLogo from 'src/assets/bifrost-logo.png';
import kiltLogo from 'src/assets/kilt-logo.png';
import kusamaLogo from 'src/assets/kusama-logo.gif';
import moonbeamLogo from 'src/assets/moonbeam-logo.png';
import moonriverLogo from 'src/assets/moonriver-logo.png';
import polkadotLogo from 'src/assets/polkadot-logo.jpg';
import soraLogo from 'src/assets/sora-logo.png';
import { network } from 'src/global/networkConstants';
import getNetwork from 'src/util/getNetwork';

const NETWORK = getNetwork();
const StyledDiv = styled.div`
    display: flex;
    align-items: center;
    text-transform: capitalize;

    img {
        width: 3rem;
        border-radius: 50%;
        margin-right: 0.5rem;
    }
`;

const getNetworkImage = (showNetwork: string) => {
	switch (showNetwork) {
	case network.KUSAMA:
		return kusamaLogo;
	case network.MOONBEAM:
		return moonbeamLogo;
	case network.MOONRIVER:
		return moonriverLogo;
	case network.KILT:
		return kiltLogo;
	case network.BIFROST:
		return bifrostLogo;
	case network.SORA:
		return soraLogo;
	default:
		return polkadotLogo;
	}
};

const StyledNetworkItem = ({ showNetwork }: {showNetwork: string}) => {
	return <StyledDiv>
		<img
			src={getNetworkImage(showNetwork)}
			alt={showNetwork}/>
		{showNetwork}
	</StyledDiv>;
};

const NetworkOptions: DropdownItemProps[] = [
	{
		children: <StyledNetworkItem showNetwork={network.SORA}/>,
		value: network.SORA
	},
	{
		children: <StyledNetworkItem showNetwork={network.POLKADOT}/>,
		value: network.POLKADOT
	},
	{
		children: <StyledNetworkItem showNetwork={network.KUSAMA}/>,
		value: network.KUSAMA
	},
	{
		children: <StyledNetworkItem showNetwork={network.MOONRIVER}/>,
		value: network.MOONRIVER
	},
	{
		children: <StyledNetworkItem showNetwork={network.MOONBEAM}/>,
		value: network.MOONBEAM
	},
	{
		children: <StyledNetworkItem showNetwork={network.KILT}/>,
		value: network.KILT
	},
	{
		children: <StyledNetworkItem showNetwork={network.BIFROST}/>,
		value: network.BIFROST
	}
];

interface Props {
    className?: string
}

const NetworkDropdown = ({ className }: Props) =>  {

	const navigate = (event: React.SyntheticEvent<HTMLElement, Event>, data: DropdownProps) => {
		if (data.value === NETWORK){
			return null;
		}
		let domain = 'network';
		if (data.value === network.SORA){
			domain = 'com';
		} else {
			window.location.href = `https://${data.value}.sorassembly.${domain}`;
		}
		
		return null;
	};

	return <Dropdown
		className={className}
		pointing='top'
		onChange={navigate}
		options={NetworkOptions}
		trigger={<StyledNetworkItem showNetwork={NETWORK}/>}
		value={NETWORK}
	/>;
};

export default styled(NetworkDropdown)`
    color: grey_secondary;
    display: flex !important;
    align-items: center;
    &:hover {
		color: white;
	}
	margin: 0 1.2rem;
`;
