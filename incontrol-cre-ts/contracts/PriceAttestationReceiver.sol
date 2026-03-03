// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title PriceAttestationReceiver
 * @notice Receives CRE workflow attestation reports via KeystoneForwarder.
 * @dev Deploy on Sepolia with the MockForwarder address for simulation,
 *      or the real KeystoneForwarder for production.
 *
 * Deploy steps (Remix):
 *   1. Open in Remix: https://remix.ethereum.org
 *   2. Paste this file, compile with Solidity ^0.8.26
 *   3. Deploy with constructor arg:
 *      - Simulation:  0x15fC6ae953E024d975e77382eEeC56A9101f9F88 (MockForwarder Sepolia)
 *      - Production:  0xF8344CFd5c43616a4366C34E3EEE75af79a74482 (KeystoneForwarder Sepolia)
 *   4. Copy the deployed contract address
 *   5. Add "consumerAddress" to config.test.json / config.production.json
 */

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @dev Minimal IReceiver interface required by CRE KeystoneForwarder
interface IReceiver is IERC165 {
    function onReport(bytes calldata metadata, bytes calldata report) external;
}

contract PriceAttestationReceiver is IReceiver, Ownable {
    // ── Storage ──
    address private s_forwarderAddress;

    struct Attestation {
        uint256 priceHash;
        uint256 priceCount;
        uint256 timestamp;
        uint256 blockNumber;
    }

    Attestation public latestAttestation;
    uint256 public attestationCount;

    // ── Events ──
    event AttestationReceived(
        uint256 indexed priceHash,
        uint256 priceCount,
        uint256 timestamp,
        uint256 blockNumber
    );
    event ForwarderUpdated(address indexed oldForwarder, address indexed newForwarder);

    // ── Errors ──
    error InvalidForwarderAddress();
    error InvalidSender(address sender, address expected);

    constructor(address _forwarderAddress) Ownable(msg.sender) {
        if (_forwarderAddress == address(0)) revert InvalidForwarderAddress();
        s_forwarderAddress = _forwarderAddress;
        emit ForwarderUpdated(address(0), _forwarderAddress);
    }

    /// @notice Called by the KeystoneForwarder with validated report data
    function onReport(bytes calldata /* metadata */, bytes calldata report) external override {
        if (msg.sender != s_forwarderAddress) {
            revert InvalidSender(msg.sender, s_forwarderAddress);
        }

        // Decode the ABI-encoded payload: (uint256 priceHash, uint256 priceCount, uint256 timestamp)
        (uint256 priceHash, uint256 priceCount, uint256 ts) = abi.decode(report, (uint256, uint256, uint256));

        latestAttestation = Attestation({
            priceHash: priceHash,
            priceCount: priceCount,
            timestamp: ts,
            blockNumber: block.number
        });
        attestationCount++;

        emit AttestationReceived(priceHash, priceCount, ts, block.number);
    }

    /// @notice ERC165 interface detection
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(IReceiver).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }

    /// @notice Update the forwarder address (owner only)
    function setForwarderAddress(address _forwarder) external onlyOwner {
        address old = s_forwarderAddress;
        s_forwarderAddress = _forwarder;
        emit ForwarderUpdated(old, _forwarder);
    }

    /// @notice Get the current forwarder address
    function getForwarderAddress() external view returns (address) {
        return s_forwarderAddress;
    }
}
